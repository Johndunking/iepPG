import React from 'react';
import UploadForm from '../src/Components/UploadForm'; // Correct import path
import './styles.css';

const App = () => {
  return (
    <div className="container">
      <h1>IEP Presentation Generator</h1>
      <UploadForm />
    </div>
  );
};

export default App;
