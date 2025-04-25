'use client'
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useSearchParams } from 'next/navigation';

// Workaround for useRouter
function useCustomRouter(): {
  query: Record<string, string>;
  push: (url: string) => void;
  isReady: boolean;
} {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });
    setQuery(queryObj);
    setIsReady(true);
  }, [searchParams]);

  const push = (url: string) => {
    window.history.pushState({}, '', url);
  };

  return { query, push, isReady };
}

// Define types for our data based on the API response
interface Doctor {
  id: string;
  name: string;
  photo?: string;
  doctor_introduction?: string;
  specialities: { name: string }[];
  fees: string;
  experience: string;
  languages: string[];
  clinic: {
    name: string;
    address: {
      locality: string;
      city: string;
      address_line1: string;
      location: string;
      logo_url?: string;
    };
  };
  video_consult: boolean;
  in_clinic: boolean;
}

export default function Home() {
  const router = useCustomRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Doctor[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Filter states
  const [consultType, setConsultType] = useState<string | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string | null>(null);
  
  // List of all specialties from the data
  const [allSpecialties, setAllSpecialties] = useState<string[]>([]);
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Fetch doctors data from API
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://srijandubey.github.io/campus-api-mock/SRM-C1-25.json');
        
        if (!response.ok) {
          throw new Error('Failed to fetch doctors');
        }
        
        const data = await response.json();
        setDoctors(data);
        setFilteredDoctors(data);
        
        // Extract unique specialties for filters
        const specialties = new Set<string>();
        data.forEach((doctor: Doctor) => {
          doctor.specialities.forEach(spec => specialties.add(spec.name));
        });
        setAllSpecialties(Array.from(specialties).sort());
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load doctors data');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchDoctors();
  }, []);
  
  // Apply URL params on initial load and when URL changes
  useEffect(() => {
    if (router.isReady && doctors.length > 0) {
      const { search, consultType, specialties, sortBy } = router.query;
      
      // Set search query from URL
      if (typeof search === 'string') {
        setSearchQuery(search);
      }
      
      // Set consultation type from URL
      if (typeof consultType === 'string') {
        setConsultType(consultType);
      }
      
      // Set specialties from URL
      if (typeof specialties === 'string') {
        setSelectedSpecialties(specialties.split(','));
      }
      
      // Set sort option from URL
      if (typeof sortBy === 'string') {
        setSortBy(sortBy);
      }
    }
  }, [router.isReady, router.query, doctors]);
  
  // Apply filters whenever filter states change
  useEffect(() => {
    if (doctors.length === 0) return;
    
    let filtered = [...doctors];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(doctor => 
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply consultation type filter
    if (consultType === 'video') {
      filtered = filtered.filter(doctor => doctor.video_consult);
    } else if (consultType === 'clinic') {
      filtered = filtered.filter(doctor => doctor.in_clinic);
    }
    
    // Apply specialty filters
    if (selectedSpecialties.length > 0) {
      filtered = filtered.filter(doctor => 
        selectedSpecialties.some(specialty => 
          doctor.specialities.some(s => s.name === specialty)
        )
      );
    }
    
    // Apply sorting
    if (sortBy === 'fees') {
      filtered.sort((a, b) => {
        const aFee = parseInt(a.fees.replace(/[^\d]/g, ''), 10);
        const bFee = parseInt(b.fees.replace(/[^\d]/g, ''), 10);
        return aFee - bFee;
      });
    } else if (sortBy === 'experience') {
      filtered.sort((a, b) => {
        const aExp = parseInt(a.experience.split(' ')[0], 10);
        const bExp = parseInt(b.experience.split(' ')[0], 10);
        return bExp - aExp; // Descending order for experience
      });
    }
    
    setFilteredDoctors(filtered);
    
    // Update URL params
    updateUrlParams();
  }, [searchQuery, consultType, selectedSpecialties, sortBy, doctors]);
  
  // Update URL parameters based on current filters
  const updateUrlParams = () => {
    const params = new URLSearchParams();
    
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    if (consultType) {
      params.set('consultType', consultType);
    }
    
    if (selectedSpecialties.length > 0) {
      params.set('specialties', selectedSpecialties.join(','));
    }
    
    if (sortBy) {
      params.set('sortBy', sortBy);
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.push(newUrl);
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      const matches = doctors
        .filter(doctor => doctor.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(true);
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
  };
  
  // Handle consultation type change
  const handleConsultTypeChange = (type: string) => {
    setConsultType(consultType === type ? null : type);
  };
  
  // Handle specialty filter change
  const handleSpecialtyChange = (specialty: string) => {
    setSelectedSpecialties(prev => {
      if (prev.includes(specialty)) {
        return prev.filter(s => s !== specialty);
      } else {
        return [...prev, specialty];
      }
    });
  };
  
  // Handle sort change
  const handleSortChange = (sort: string) => {
    setSortBy(sortBy === sort ? null : sort);
  };
  
  // Toggle mobile filters visibility
  const toggleMobileFilters = () => {
    setMobileFiltersOpen(!mobileFiltersOpen);
  };
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Close suggestions when clicking outside
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setConsultType(null);
    setSelectedSpecialties([]);
    setSortBy(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Find Doctors | Book Appointment Online</title>
        <meta name="description" content="Find and book the best doctors near you" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Header */}
      <header className="bg-blue-600 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            {/* Mobile hamburger menu */}
            <button 
              className="mr-4 text-white md:hidden"
              onClick={toggleMobileMenu}
              data-testid="hamburger-menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Logo */}
            <a href="/" className="text-white font-bold text-xl">
              HealthCare
            </a>
          </div>
          
          {/* Global search bar for desktop */}
          <div className="hidden md:block w-1/2">
            <div className="relative" ref={searchRef}>
              <input
                type="text"
                placeholder="Search for doctors, specialties, clinics..."
                value={searchQuery}
                onChange={handleSearchChange}
                data-testid="header-search"
                className="w-full py-2 px-4 rounded-full border-none focus:ring-2 focus:ring-blue-300 focus:outline-none"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white rounded-lg mt-1 shadow-lg border border-gray-200">
                  {suggestions.map((doctor) => (
                    <div
                      key={doctor.id}
                      onClick={() => handleSuggestionClick(doctor.name)}
                      data-testid="suggestion-item"
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 flex items-center"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-blue-600">
                        {doctor.photo ? (
                          <img src={doctor.photo} alt={doctor.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          doctor.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{doctor.name}</p>
                        <p className="text-xs text-gray-600">
                          {doctor.specialities.map(s => s.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-white">
            <a href="/login" className="hidden md:inline-block mr-4">Login</a>
            <button className="bg-white text-blue-600 px-4 py-1 rounded-full font-medium hover:bg-blue-50 transition">
              Sign Up
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 md:hidden">
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Menu</h2>
              <button onClick={toggleMobileMenu}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Mobile search */}
            <div className="mb-6" ref={searchRef}>
              <input
                type="text"
                placeholder="Search for doctors, specialties..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg">
                  {suggestions.map((doctor) => (
                    <div
                      key={doctor.id}
                      onClick={() => {
                        handleSuggestionClick(doctor.name);
                        setMobileMenuOpen(false);
                      }}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      {doctor.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <nav className="space-y-6">
              <a href="/find-doctors" className="block py-2 border-b border-gray-200">Find Doctors</a>
              <a href="/hospitals" className="block py-2 border-b border-gray-200">Hospitals</a>
              <a href="/specialities" className="block py-2 border-b border-gray-200">Specialities</a>
              <a href="/health-packages" className="block py-2 border-b border-gray-200">Health Packages</a>
              <div className="pt-4">
                <a href="/login" className="block py-2 text-blue-600">Login</a>
                <a href="/signup" className="block py-2 text-blue-600">Sign Up</a>
              </div>
            </nav>
          </div>
        </div>
      )}
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Find Doctors</h1>
          
          {/* Mobile filters button */}
          <button 
            className="flex items-center md:hidden bg-blue-50 text-blue-600 px-3 py-1 rounded-lg"
            onClick={toggleMobileFilters}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Filters
          </button>
        </div>
        
        {/* Mobile search for search page */}
        <div className="md:hidden mb-6" ref={searchRef}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for doctors by name"
              value={searchQuery}
              onChange={handleSearchChange}
              data-testid="autocomplete-input"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button className="absolute right-3 top-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg">
                {suggestions.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => handleSuggestionClick(doctor.name)}
                    data-testid="suggestion-item"
                    className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  >
                    {doctor.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters sidebar - desktop */}
          <div className={`w-full md:w-1/4 md:block ${mobileFiltersOpen ? 'fixed inset-0 z-30 bg-white p-4 overflow-y-auto' : 'hidden'}`}>
            {mobileFiltersOpen && (
              <div className="flex justify-between items-center mb-4 md:hidden">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button onClick={toggleMobileFilters}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">Filters</h3>
                <button 
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  data-testid="clear-all-filters"
                >
                  Clear All
                </button>
              </div>
              
              {/* Consultation Type Filter */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-gray-700" data-testid="filter-header-moc">Consultation Mode</h3>
                <div className="space-y-2 text-black">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={consultType === 'video'}
                      onChange={() => handleConsultTypeChange('video')}
                      data-testid="filter-video-consult"
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="flex items-center ">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Video Consult</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={consultType === 'clinic'}
                      onChange={() => handleConsultTypeChange('clinic')}
                      data-testid="filter-in-clinic"
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>In Clinic</span>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Specialty Filter */}
              <div className="mb-6 text-black">
                <h3 className="font-semibold mb-3 text-gray-700" data-testid="filter-header-speciality">Speciality</h3>
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search specialities"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-2 top-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allSpecialties.map((specialty) => {
                    const formattedId = specialty.replace(/\s+/g, '-').replace(/\/+/g, '-');
                    return (
                      <label key={specialty} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSpecialties.includes(specialty)}
                          onChange={() => handleSpecialtyChange(specialty)}
                          data-testid={`filter-specialty-${formattedId}`}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">{specialty}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              
              {/* Sort Filter */}
              <div className='text-black'>
                <h3 className="font-semibold mb-3 text-gray-700" data-testid="filter-header-sort">Sort By</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={sortBy === 'fees'}
                      onChange={() => handleSortChange('fees')}
                      data-testid="sort-fees"
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Fees (Low to High)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={sortBy === 'experience'}
                      onChange={() => handleSortChange('experience')}
                      data-testid="sort-experience"
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Experience (High to Low)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Doctor List */}
          <div className="w-full md:w-3/4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 p-4 rounded-lg text-red-700">{error}</div>
            ) : filteredDoctors.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg text-gray-600">No doctors found matching your criteria.</p>
                <button 
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    data-testid="doctor-card"
                    className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition flex flex-col md:flex-row gap-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-50 rounded-full flex items-center justify-center overflow-hidden border-2 border-blue-100">
                        {doctor.photo ? (
                          <img src={doctor.photo} alt={doctor.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl text-blue-500">{doctor.name.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-grow">
                      <h2 data-testid="doctor-name" className="text-xl font-semibold text-gray-800">{doctor.name}</h2>
                      <p data-testid="doctor-specialty" className="text-gray-600 mb-2">
                        {doctor.specialities.map(spec => spec.name).join(", ")}
                      </p>
                      
                      {doctor.doctor_introduction && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{doctor.doctor_introduction}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 mt-2">
                        <span data-testid="doctor-experience" className="flex items-center text-gray-700 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {doctor.experience}
                        </span>
                        <span data-testid="doctor-fee" className="flex items-center text-gray-700 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {doctor.fees}
                        </span>
                        {doctor.clinic && (
                          <span className="flex items-center text-gray-700 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            {doctor.clinic.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {doctor.video_consult && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Video Consult
                          </span>
                        )}
                        {doctor.in_clinic && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            In Clinic
                          </span>
                        )}
                        {doctor.languages && doctor.languages.length > 0 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {doctor.languages.slice(0, 2).join(", ")}
                            {doctor.languages.length > 2 ? ` +${doctor.languages.length - 2}` : ''}
                          </span>
                        )}
                      </div>
                      
                      {doctor.clinic && doctor.clinic.address && (
                        <div className="mt-3 text-xs text-gray-500 flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="line-clamp-1">
                            {[
                              doctor.clinic.address.address_line1,
                              doctor.clinic.address.locality,
                              doctor.clinic.address.city
                            ].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 flex flex-col items-center md:items-end justify-center mt-4 md:mt-0">
                      <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-medium mb-2">
                        Available Today
                      </div>
                      <button className="w-full md:w-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm">
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {filteredDoctors.length > 0 && (
              <div className="mt-6 flex justify-center">
                <div className="inline-flex rounded-md shadow">
                  <button className="py-2 px-4 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-l-md">
                    Previous
                  </button>
                  <button className="py-2 px-4 border-t border-b border-gray-300 bg-blue-50 text-sm font-medium text-blue-700">
                    1
                  </button>
                  <button className="py-2 px-4 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    2
                  </button>
                  <button className="py-2 px-4 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    3
                  </button>
                  <button className="py-2 px-4 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-r-md">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">HealthCare</h3>
              <p className="text-sm mb-4">Find the best doctors, clinics & hospitals in your area.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-white">
                  <span className="sr-only">Facebook</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white">
                  <span className="sr-only">Instagram</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">For Patients</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Search for Doctors</a></li>
                <li><a href="#" className="hover:text-white">Book Appointment</a></li>
                <li><a href="#" className="hover:text-white">Consult Online</a></li>
                <li><a href="#" className="hover:text-white">Health Articles</a></li>
                <li><a href="#" className="hover:text-white">Health Packages</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">For Doctors</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Join Medical Network</a></li>
                <li><a href="#" className="hover:text-white">Practice Management</a></li>
                <li><a href="#" className="hover:text-white">Success Stories</a></li>
                <li><a href="#" className="hover:text-white">Medical Resources</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Contact Us</h3>
              <address className="not-italic text-sm space-y-2">
                <p>Email: support@healthcare.com</p>
                <p>Phone: +91</p>
                <p>123 Health Street, Medical District</p>
                <p>New York, NY 10001</p>
              </address>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-700 text-sm text-center">
            <p>© {new Date().getFullYear()} HealthCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}