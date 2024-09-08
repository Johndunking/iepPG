import { useState } from 'react';
import axios from 'axios';
import { Oval } from 'react-loader-spinner';

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false); // State to track loading

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Show the loading spinner

    try {
      // Check if the user is authorized
      const authResponse = await axios.get('/check-auth');
      if (!authResponse.data.isAuthorized) {
        // Redirect to OAuth authorization if not authorized
        window.location.href = authResponse.data.authUrl;
        return;
      }

      // Prepare form data for the file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload the file
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Open the updated Google Slides presentation in a new tab
      const { link } = response.data;
      window.open(link, '_blank');
    } catch (error) {
      console.error('Error uploading file', error);
      
      // Handle OAuth redirection or other errors
      if (error.response && error.response.status === 401) {
        // Redirect to OAuth if authentication is required
        window.location.href = error.response.data.authUrl;
      } else {
        alert('Failed to upload file. Please try again later.');
      }
    } finally {
      setLoading(false); // Hide the loading spinner
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
      </form>
    </div>
  );
};

export default UploadForm;