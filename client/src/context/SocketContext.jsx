import React, { createContext, useContext } from 'react';
import io from 'socket.io-client';
import { SERVER_URL } from '../config'; // <-- IMPORT FROM CONFIG

const socket = io(SERVER_URL, {
    autoConnect: false
});

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};