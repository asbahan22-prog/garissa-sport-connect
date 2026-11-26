import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth';
import './index.css';
import { ToastViewport } from './ui';

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div role="alert" className="p-8">Something on this page failed to load. Refresh and try again.</div>;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Boundary>
          <App />
          <ToastViewport />
        </Boundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
