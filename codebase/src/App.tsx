import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { AppShell } from "./components/layout/AppShell";
import { GuestOnly, HomeRedirect, RequireAuth, RequirePermission } from "./components/auth/Guards";

import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import UserDetailPage from "./pages/admin/UserDetailPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import EnrollmentsPage from "./pages/admin/EnrollmentsPage";
import RolesPage from "./pages/admin/RolesPage";
import SettingsPage from "./pages/admin/SettingsPage";
import ActivityLogPage from "./pages/admin/ActivityLogPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

import CourseListPage from "./pages/courses/CourseListPage";
import CourseCreatePage from "./pages/courses/CourseCreatePage";
import CourseEditorPage from "./pages/courses/CourseEditorPage";
import ActivityEditorPage from "./pages/courses/ActivityEditorPage";
import GradingQueuePage from "./pages/instructor/GradingQueuePage";
import NotificationsPage from "./pages/NotificationsPage";

import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import StudentsPage from "./pages/instructor/StudentsPage";
import CourseProgressPage from "./pages/instructor/CourseProgressPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import MyCoursesPage from "./pages/student/MyCoursesPage";
import CatalogPage from "./pages/student/CatalogPage";
import CourseDetailPage from "./pages/student/CourseDetailPage";
import StudentProgressPage from "./pages/student/StudentProgressPage";
import CoursePlayer from "./pages/player/CoursePlayer";

const ADMIN = ["users.manage", "courses.manage_all", "settings.manage", "roles.manage", "categories.manage", "enrollments.manage_all", "system.view"] as const;

const App = () => (
  <ErrorBoundary>
  <BrowserRouter>
    <SettingsProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/app" element={<RequireAuth><HomeRedirect /></RequireAuth>} />

            <Route path="/learn/courses/:id/play/:lessonId?" element={<RequireAuth><CoursePlayer /></RequireAuth>} />
            <Route path="/learn/courses/:id/announcements" element={<RequireAuth><CoursePlayer /></RequireAuth>} />
            <Route path="/learn/courses/:id/discussions/:topicId?" element={<RequireAuth><CoursePlayer /></RequireAuth>} />
            <Route path="/learn/courses/:id/grades" element={<RequireAuth><CoursePlayer /></RequireAuth>} />

            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Administration */}
              <Route path="/admin" element={<RequirePermission any={[...ADMIN]}><AdminDashboard /></RequirePermission>} />
              <Route path="/admin/users" element={<RequirePermission any={["users.manage"]}><UsersPage /></RequirePermission>} />
              <Route path="/admin/users/:id" element={<RequirePermission any={["users.manage"]}><UserDetailPage /></RequirePermission>} />
              <Route path="/admin/courses" element={<RequirePermission any={["courses.manage_all"]}><CourseListPage /></RequirePermission>} />
              <Route path="/admin/courses/new" element={<RequirePermission any={["courses.manage_all"]}><CourseCreatePage /></RequirePermission>} />
              <Route path="/admin/courses/:id" element={<RequirePermission any={["courses.manage_all"]}><CourseEditorPage /></RequirePermission>} />
              <Route path="/admin/courses/:id/lessons/:lessonId" element={<RequirePermission any={["courses.manage_all"]}><ActivityEditorPage /></RequirePermission>} />
              <Route path="/admin/categories" element={<RequirePermission any={["categories.manage"]}><CategoriesPage /></RequirePermission>} />
              <Route path="/admin/enrollments" element={<RequirePermission any={["enrollments.manage_all"]}><EnrollmentsPage /></RequirePermission>} />
              <Route path="/admin/roles" element={<RequirePermission any={["roles.manage"]}><RolesPage /></RequirePermission>} />
              <Route path="/admin/settings" element={<RequirePermission any={["settings.manage"]}><SettingsPage /></RequirePermission>} />
              <Route path="/admin/activity" element={<RequirePermission any={["system.view"]}><ActivityLogPage /></RequirePermission>} />

              {/* Teaching */}
              <Route path="/teach" element={<RequirePermission any={["courses.teach"]}><InstructorDashboard /></RequirePermission>} />
              <Route path="/teach/courses" element={<RequirePermission any={["courses.teach"]}><CourseListPage /></RequirePermission>} />
              <Route path="/teach/courses/new" element={<RequirePermission any={["courses.create", "courses.manage_all"]}><CourseCreatePage /></RequirePermission>} />
              <Route path="/teach/courses/:id" element={<RequirePermission any={["courses.teach"]}><CourseEditorPage /></RequirePermission>} />
              <Route path="/teach/courses/:id/lessons/:lessonId" element={<RequirePermission any={["courses.teach"]}><ActivityEditorPage /></RequirePermission>} />
              <Route path="/teach/grading" element={<RequirePermission any={["courses.teach"]}><GradingQueuePage /></RequirePermission>} />
              <Route path="/teach/students" element={<RequirePermission any={["courses.teach"]}><StudentsPage /></RequirePermission>} />
              <Route path="/teach/progress" element={<RequirePermission any={["courses.teach"]}><CourseProgressPage /></RequirePermission>} />

              {/* Learning */}
              <Route path="/learn" element={<StudentDashboard />} />
              <Route path="/learn/courses" element={<MyCoursesPage />} />
              <Route path="/learn/catalog" element={<CatalogPage />} />
              <Route path="/learn/catalog/:id" element={<CourseDetailPage />} />
              <Route path="/learn/progress" element={<StudentProgressPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </SettingsProvider>
  </BrowserRouter>
  </ErrorBoundary>
);

export default App;
