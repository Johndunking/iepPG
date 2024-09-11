import { useState, useEffect } from 'react';
import axios from 'axios';
import { Oval } from 'react-loader-spinner';

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(null); // Use null to indicate unknown state initially

  // Check if the user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResponse = await axios.get('https://ieppg-48efe5776c91.herokuapp.com/check-auth', { withCredentials: true });
        setAuthenticated(authResponse.data.authenticated);

        // Redirect to auth screen if not authenticated
        if (!authResponse.data.authenticated) {
          window.location.href = '/auth';
        }
      } catch (error) {
        console.error('Error checking authentication', error);
        setAuthenticated(false); // In case of error, set to unauthenticated to avoid looping
      }
    };

    // Only check authentication once on component mount
    checkAuth();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert('Please upload a file first.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('https://ieppg-48efe5776c91.herokuapp.com/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true, // Send cookies with request for authentication
      });

      const { link } = response.data;
      window.open(link, '_blank');
    } catch (error) {
      console.error('Error uploading file', error);
      alert('Failed to upload file.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await axios.get('https://ieppg-48efe5776c91.herokuapp.com/logout', { withCredentials: true });
      window.location.href = 'https://ieppg-48efe5776c91.herokuapp.com/authenticate';
    } catch (error) {
      console.error('Error switching account', error);
      alert('Failed to switch account.');
    }
  };

  // If the authenticated state is unknown, render a loading spinner
  if (authenticated === null) {
    return (
      <div className="loading-overlay">
        <Oval
          height={80}
          width={80}
          color="#4fa94d"
          wrapperStyle={{}}
          visible={true}
          ariaLabel="oval-loading"
          secondaryColor="#4fa94d"
          strokeWidth={2}
          strokeWidthSecondary={2}
        />
      </div>
    );
  }

  return (
    <div>
      {loading && (
        <div className="loading-overlay">
          <Oval
            height={80}
            width={80}
            color="#4fa94d"
            wrapperStyle={{}}
            visible={true}
            ariaLabel="oval-loading"
            secondaryColor="#4fa94d"
            strokeWidth={2}
            strokeWidthSecondary={2}
          />
        </div>
      )}

      {authenticated && (
        <form onSubmit={handleSubmit}>
          <input type="file" onChange={handleFileChange} />
          <button type="submit">Upload</button>
          <button type="button" onClick={handleSwitchAccount} style={{ marginLeft: '10px' }}>
            Switch Account
          </button>
        </form>
      )}

      <style jsx>{`
        form {
          display: flex;
          justify-content: center;
          gap: 20px;
        }
        button {
          color: white;
          background-color: lightgray;
          border: none;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.3s ease, background-color 0.3s ease;
          padding: 10px 20px;
        }
        button:hover {
          transform: scale(1.1);
          background-color: gray;
        }
        button:focus {
          outline: none;
        }
        input[type="file"] {
          margin-right: 20px;
        }
      `}</style>
    </div>
  );
};

export default UploadForm;