import React from 'react';
import {createRoot} from 'react-dom/client';
import Bootstrap from './Bootstrap';
import PwaStatus from './PwaStatus';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><PwaStatus/><Bootstrap/></React.StrictMode>);
