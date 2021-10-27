export * from './constants';
export * from './middlewares';
export * from './wss';

export const addTimeToCurrentDate = (milliseconds) => new Date(Date.now() + milliseconds);
