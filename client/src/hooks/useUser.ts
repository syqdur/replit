import { useState, useEffect } from 'react';
import { getDeviceId, getUserName, setUserName } from '../utils/deviceId';

export const useUser = () => {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [deviceId] = useState<string>(getDeviceId());
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    // Check if user was deleted and clear the flag after reload
    if (localStorage.getItem('userDeleted') === 'true') {
      console.log(`🧹 Clearing userDeleted flag after reload`);
      localStorage.clear(); // Clear everything including the flag
    }
    
    const storedName = getUserName();
    if (storedName) {
      setUserNameState(storedName);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  const handleSetUserName = (name: string) => {
    setUserName(name);
    setUserNameState(name);
    setShowNamePrompt(false);
  };

  return {
    userName,
    deviceId,
    showNamePrompt,
    setUserName: handleSetUserName
  };
};