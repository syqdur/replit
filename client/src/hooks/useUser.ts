import { useState, useEffect } from 'react';
import { getDeviceId, getUserName, setUserName } from '../utils/deviceId';

export const useUser = () => {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [deviceId] = useState<string>(getDeviceId());
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
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