import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Materias from './pages/Materias'
import BrainDrain from './pages/BrainDrain'
import Flashcards from './pages/Flashcards'
import Chat from './pages/Chat'
import ExamSimulator from './pages/ExamSimulator'
import Layout from './components/Layout'

const queryClient = new QueryClient()

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/materias" element={<Materias />} />
                <Route path="/brain-drain" element={<BrainDrain />} />
                <Route path="/flashcards" element={<Flashcards />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/exams" element={<ExamSimulator />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}