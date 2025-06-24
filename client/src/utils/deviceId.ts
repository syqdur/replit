import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'wedding_device_id';
const USER_NAME_KEY = 'wedding_user_name';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const getUserName = (): string | null => {
  return localStorage.getItem(USER_NAME_KEY);
};

export const setUserName = (name: string): void => {
  localStorage.setItem(USER_NAME_KEY, name);
};