import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import ExcelPage from './pages/ExcelPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/excel" element={<ExcelPage />} />
      </Routes>
    </BrowserRouter>
  );
}