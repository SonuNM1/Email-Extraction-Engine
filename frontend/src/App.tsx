import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import ExcelPage from './pages/ExcelPage';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" theme="dark" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/excel" element={<ExcelPage />} />
      </Routes>
    </BrowserRouter>
  );
}