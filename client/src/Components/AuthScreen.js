import React, { useEffect } from 'react';

const AuthScreen = () => {
  useEffect(() => {
    // Redirect to Google OAuth for authentication
    window.location.href = 'https://ieppg-48efe5776c91.herokuapp.com/authenticate';
  }, []);

  return (
    <div>
      <h2>Redirecting to Google Sign-In...</h2>
    </div>
  );
};

export default AuthScreen;