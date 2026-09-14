import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FindItem from './pages/FindItem';
import Inventory from './pages/Inventory';
import Architecture from './pages/Architecture';
import { StockProvider } from './context/StockContext';
import './index.css';

function App() {
  return (
    <StockProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="find" element={<FindItem />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="architecture" element={<Architecture />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StockProvider>
  );
}

export default App;
