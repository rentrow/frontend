import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar      from './components/Navbar';
import Home        from './pages/Home';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Verify      from './pages/Verify';
import PostAd      from './pages/PostAd';
import Messages    from './pages/Messages';
import Thread      from './pages/Thread';
import MyListings  from './pages/MyListings';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />

          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/"                  element={<Home />}       />
              <Route path="/login"             element={<Login />}      />
              <Route path="/register"          element={<Register />}   />
              <Route path="/verify"            element={<Verify />}     />
              <Route path="/post-ad"           element={<PostAd />}     />
              <Route path="/messages"          element={<Messages />}   />
              <Route path="/messages/:propertyId" element={<Thread />}  />
              <Route path="/my-listings"       element={<MyListings />} />
              <Route path="/admin"             element={<AdminDashboard />} />
            </Routes>
          </main>

          <footer className="footer">
            <div className="container footer-inner">
              <span className="footer-copy">© 2026 RentRow · All rights reserved.</span>
              <div className="footer-links">
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Help</a>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
