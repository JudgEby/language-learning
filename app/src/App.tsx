import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LevelPage } from './pages/LevelPage';
import { RulesListPage } from './pages/RulesListPage';
import { StudyViewPage } from './pages/StudyViewPage';
import { TestsListPage } from './pages/TestsListPage';
import { TestViewPage } from './pages/TestViewPage';

export default function App() {
  return (
    <BrowserRouter>
      <main className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:level" element={<LevelPage />} />
          <Route path="/:level/rules" element={<RulesListPage />} />
          <Route path="/:level/rules/:studyKeyParam" element={<StudyViewPage />} />
          <Route path="/:level/tests" element={<TestsListPage />} />
          <Route path="/:level/tests/:dayId/:questionIndex" element={<TestViewPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
