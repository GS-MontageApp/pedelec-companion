import React from 'react';
import {createRoot} from 'react-dom/client';
import Bootstrap from './Bootstrap';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Bootstrap/></React.StrictMode>);
