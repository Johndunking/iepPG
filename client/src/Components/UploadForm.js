import { useState } from 'react';
import axios from 'axios';
import { Oval } from 'react-loader-spinner';

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Function to handle file upload
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if the user is authenticated
    try {
      const authResponse = await axios.get('https://ieppg-48efe5776c91.herokuapp.com/check-auth', { withCredentials: true });

      if (!authResponse.data.authenticated) {
        // If not authenticated, redirect to Google OAuth
        window.location.href = 'https://ieppg-48efe5776c91.herokuapp.com/authenticate';
        return; // Stop execution here until authentication is complete
      }

      if (!file) {
        alert('Please upload a file first.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      setLoading(true); // Show the loading spinner

      // Proceed with file upload
      const response = await axios.post('https://ieppg-48efe5776c91.herokuapp.com/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true, // Send cookies with request for authentication
      });

      // Open the updated Google Slides presentation in a new tab
      const { link } = response.data;
      window.open(link, '_blank');

    } catch (error) {
      console.error('Error uploading file', error);
      alert('Failed to upload file.');
    } finally {
      setLoading(false); // Hide the loading spinner
    }
  };

  // Function to handle account switching
  const handleSwitchAccount = async () => {
    try {
      // Call the logout route to clear the session
      await axios.get('https://ieppg-48efe5776c91.herokuapp.com/logout', { withCredentials: true });

      // Redirect to Google OAuth for authentication
      window.location.href = 'https://ieppg-48efe5776c91.herokuapp.com/authenticate';
    } catch (error) {
      console.error('Error switching account', error);
      alert('Failed to switch account.');
    }
  };

  return (
    <div>
      {loading && (
        <div className="loading-overlay">
          <Oval
            height={80}
            width={80}
            color="#4fa94d"
            wrapperStyle={{}}
            wrapperClass=""
            visible={true}
            ariaLabel="oval-loading"
            secondaryColor="#4fa94d"
            strokeWidth={2}
            strokeWidthSecondary={2}
          />
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Upload</button>
        <button type="button" onClick={handleSwitchAccount} style={{ marginLeft: '10px' }}>
          Switch Account
        </button>
      </form>
    </div>
  );
};

export default UploadForm;