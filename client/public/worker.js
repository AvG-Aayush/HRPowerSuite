// Service Worker for background data processing
self.addEventListener('message', function(e) {
  const { type, data } = e.data;
  
  switch(type) {
    case 'PROCESS_ATTENDANCE_DATA':
      // Process large attendance datasets in background
      const processedData = processAttendanceData(data);
      self.postMessage({ type: 'ATTENDANCE_PROCESSED', data: processedData });
      break;
      
    case 'CACHE_USER_DATA':
      // Cache user data for offline access
      cacheUserData(data);
      self.postMessage({ type: 'USER_DATA_CACHED' });
      break;
      
    default:
      console.log('Unknown worker message type:', type);
  }
});

function processAttendanceData(attendanceArray) {
  // Process attendance calculations without blocking UI
  return attendanceArray.map(record => ({
    ...record,
    totalHours: calculateWorkHours(record.checkIn, record.checkOut),
    overtime: calculateOvertime(record.checkIn, record.checkOut),
    status: determineStatus(record)
  }));
}

function calculateWorkHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
}

function calculateOvertime(checkIn, checkOut) {
  const totalHours = calculateWorkHours(checkIn, checkOut);
  return Math.max(0, totalHours - 8); // Overtime after 8 hours
}

function determineStatus(record) {
  if (!record.checkIn) return 'absent';
  if (!record.checkOut) return 'present';
  return 'completed';
}

function cacheUserData(userData) {
  // Cache user preferences and frequently accessed data
  try {
    localStorage.setItem('userCache', JSON.stringify({
      ...userData,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to cache user data:', error);
  }
}