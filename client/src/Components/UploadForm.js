import { useState, useEffect } from 'react';
import axios from 'axios';
import { Oval } from 'react-loader-spinner';

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Check if the user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResponse = await axios.get('https://ieppg-48efe5776c91.herokuapp.com/check-auth', { withCredentials: true });
        setAuthenticated(authResponse.data.authenticated);

        // Automatically redirect if not authenticated
        if (!authResponse.data.authenticated) {
          window.location.href = 'https://ieppg-48efe5776c91.herokuapp.com/authenticate';
        }
      } catch (error) {
        console.error('Error checking authentication', error);
      }
    };

    checkAuth();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Function to handle file upload
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert('Please upload a file first.');
      return;
    }

    setLoading(true); // Show the loading spinner

    try {
      // Proceed with file upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('https://ieppg-48efe5776c91.herokuapp.com/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
            visible={true}
            ariaLabel="oval-loading"
            secondaryColor="#4fa94d"
            strokeWidth={2}
            strokeWidthSecondary={2}
          />
        </div>
      )}

      {!authenticated ? (
        <div>
          <button onClick={() => window.location.href = 'https://ieppg-48efe5776c91.herokuapp.com/authenticate'}>Sign In with Google</button>
        </div>
      ) : (
        <>
         <div className="container">
  {/* Instructions box */}
          <div className="instructions-box">
            <p>Instructions:</p>
            <ul>
              <li>1. Sign in with your Google account if prompted.</li>
              <li>2. Upload a valid PDF file containing the IEP data (Download IEP files from SEIS then upload here).</li>
              <li>3. Once uploaded, a new Google Slides presentation will be generated and saved to the signed-in Google Drive.</li>
              <li>4. Review all slides and make sure they match your use case for the IEP meeting.</li>
              <li>5. You can switch accounts if needed by clicking the "Switch Account" button.</li>
            </ul>
          </div>

          {/* Upload form */}
          <form onSubmit={handleSubmit}>
            <input type="file" onChange={handleFileChange} />
            <button type="submit">Upload</button>
            <button type="button" onClick={handleSwitchAccount} style={{ marginLeft: '10px' }}>
              Switch Account
            </button>
          </form>
        </div>
        </>
      )}

      {/* Styles for buttons and instructions */}
          <style jsx>{`
      .container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        gap: 40px; /* Gap between the instructions and upload form */
      }

      form {
        display: flex;
        flex-direction: column;
        align-items: center;
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

      .instructions-box {
        padding: 15px;
        border: 1px solid #ccc;
        border-radius: 8px;
        background-color: #f9f9f9;
        max-width: 300px;
      }

      .instructions-box p {
        font-weight: bold;
      }

      .instructions-box ul {
        margin: 0;
        padding-left: 20px;
      }

      .instructions-box li {
        margin-bottom: 10px;
      }

      /* Media Query for Mobile Devices */
      @media (max-width: 600px) {
        .container {
          flex-direction: column;
          align-items: center;
        }

        form {
          width: 100%;
        }

        .instructions-box {
          width: 100%;
          max-width: 100%;
        }
      }
    `}</style>
    </div>
  );
};

export default UploadForm;