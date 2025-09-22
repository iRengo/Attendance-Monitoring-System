# ---------------- Kivy Core ----------------
from kivy.app import App
from kivy.uix.screenmanager import ScreenManager, Screen, FadeTransition
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
from kivy.uix.image import Image
from kivy.uix.popup import Popup
from kivy.uix.widget import Widget
from kivy.uix.behaviors import ButtonBehavior
from kivy.animation import Animation
from kivy.clock import Clock
from kivy.graphics import Color, Rectangle, RoundedRectangle
from kivy.graphics.texture import Texture
from kivy.core.window import Window
from kivy.uix.gridlayout import GridLayout

# ---------------- Data and Utilities ----------------
import numpy as np
from datetime import datetime
from scipy.spatial.distance import cosine

# ---------------- Database ----------------
import psycopg2

# ---------------- Computer Vision ----------------
import cv2
from insightface.app import FaceAnalysis


# ---------------- Hover Button ----------------
class HoverButton(Button):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.default_color = (63/255, 163/255, 216/255, 1)
        self.hover_color = (43/255, 143/255, 196/255, 1)
        self.press_color = (23/255, 123/255, 176/255, 1)
        self.background_normal = ""
        self.background_color = self.default_color
        Window.bind(mouse_pos=self.on_mouse_pos)

    def on_mouse_pos(self, window, pos):
        if not self.get_root_window():
            return
        inside = self.collide_point(*self.to_widget(*pos))
        self.background_color = self.hover_color if inside else self.default_color

    def on_press(self):
        self.background_color = self.press_color

    def on_release(self):
        self.background_color = self.hover_color

# ---------------- Welcome Screen ----------------
class WelcomeScreen(FloatLayout):
    def __init__(self, switch_callback, **kwargs):
        super().__init__(**kwargs)

        # Background
        self.bg_image = Image(source="images/bg.png", allow_stretch=True, keep_ratio=False, size_hint=(1,1))
        self.add_widget(self.bg_image)

        # Foreground layout
        self.foreground = BoxLayout(orientation="vertical", padding=20, spacing=15,
                                    size_hint=(0.8,0.8), pos_hint={"center_x":0.5, "center_y":0.5})
        self.add_widget(self.foreground)

        # Logo
        self.foreground.add_widget(Image(source="images/aics_logo.png", size_hint=(1,0.3), allow_stretch=True, keep_ratio=True))

        # Title
        self.title = Label(text="[b]Facial Recognition Attendance System[/b]",
                           font_size=32, markup=True, halign="center", valign="middle",
                           color=(1,1,1,1), size_hint=(1,None), height=50)
        self.title.bind(size=lambda i,v: setattr(i,'text_size',(i.width,i.height)))
        self.foreground.add_widget(self.title)

        # Campus label
        self.campus = Label(text="for Asian Institute of Computer Studies Bacoor",
                            font_size=22, halign="center", valign="middle",
                            color=(0.9,0.9,0.9,1), size_hint=(1,None), height=40)
        self.campus.bind(size=lambda i,v: setattr(i,'text_size',(i.width,i.height)))
        self.foreground.add_widget(self.campus)

        # Spacer
        self.foreground.add_widget(Widget(size_hint=(1,0.2)))

        # Get Started button
        self.start_btn = HoverButton(text="[b]Get Started[/b]", markup=True, size_hint=(None,None),
                                     width=220, height=60, color=(1,1,1,1),
                                     font_size=20, on_release=lambda x:switch_callback())
        self.start_btn.opacity = 0
        self.start_btn.pos_hint = {"center_x":0.5}
        self.foreground.add_widget(self.start_btn)

        # Fade-in animation
        Clock.schedule_once(self.animate_ui, 1)

    def animate_ui(self, dt):
        Animation(opacity=1, duration=1.5).start(self.start_btn)

# ---------------- Login Screen ----------------
class LoginScreen(FloatLayout):
    def __init__(self, switch_to_dashboard=None, **kwargs):
        super().__init__(**kwargs)
        self.switch_to_dashboard = switch_to_dashboard
        self._build_ui()
        self._fade_in()
        self._connect_db()

    def _connect_db(self):
        try:
            self.conn = psycopg2.connect(host="localhost", database="Attendance-DB",
                                         user="postgres", password="xd123")
            self.cursor = self.conn.cursor()
        except Exception as e:
            self._show_popup("Database Error", f"Cannot connect to DB:\n{str(e)}")
            self.login_btn.disabled = True

        self.login_btn.bind(on_release=self.check_login)

    def _show_popup(self, title, message):
        popup_content = BoxLayout(orientation="vertical", padding=10, spacing=10)
        popup_content.add_widget(Label(text=message))
        close_btn = Button(text="OK", size_hint=(1,0.3))
        popup_content.add_widget(close_btn)
        popup = Popup(title=title, content=popup_content, size_hint=(0.6,0.4))
        close_btn.bind(on_release=popup.dismiss)
        popup.open()

    def check_login(self, instance):
        username = self.username.text.strip()
        password = self.password.text.strip()

        if not username or not password:
            self._show_popup("Error","Please enter both username and password.")
            return

        try:
            self.cursor.execute("SELECT username, role FROM users WHERE username=%s AND password=%s",
                                (username,password))
            result = self.cursor.fetchone()

            if result:
                db_username, role = result
                if role.lower()=="admin":
                    self._show_popup("Login Successful","Admin login successful!")
                    if self.switch_to_dashboard:
                        Clock.schedule_once(lambda dt: self.switch_to_dashboard(),0.5)
                else:
                    self._show_popup("Login Successful",f"Welcome {db_username}!")
            else:
                self._show_popup("Invalid Login","Invalid username or password.")
        except Exception as e:
            self._show_popup("Error", str(e))

    def _build_ui(self):
        # Background
        self.bg_image = Image(source="images/bg.png", allow_stretch=True, keep_ratio=False, size_hint=(1,1))
        self.add_widget(self.bg_image)

        self.foreground = BoxLayout(orientation="vertical", padding=40, spacing=15,
                                    size_hint=(0.6,0.8), pos_hint={"center_x":0.5,"center_y":0.5})
        self.add_widget(self.foreground)

        self.logo = Image(source="images/admin.png", size_hint=(1,None), height=200)
        self.foreground.add_widget(self.logo)

        self.title = Label(text="[b]Administrator Login[/b]", markup=True, font_size=28,
                           color=(1,1,1,1), size_hint=(1,None), height=50)
        self.foreground.add_widget(self.title)

        self.foreground.add_widget(Widget(size_hint=(1,None), height=50))

        self.username = TextInput(hint_text="Username", size_hint=(1,None), height=50,
                                  multiline=False, padding=[10,15])
        self.foreground.add_widget(self.username)

        self.password = TextInput(hint_text="Password", password=True, size_hint=(1,None),
                                  height=50, multiline=False, padding=[10,15])
        self.foreground.add_widget(self.password)

        self.foreground.add_widget(Label(size_hint=(1,None), height=10))

        self.login_btn = HoverButton(text="[b]Login[/b]", markup=True, size_hint=(1,None),
                                     height=55, font_size=18, color=(1,1,1,1))
        self.foreground.add_widget(self.login_btn)

    def _fade_in(self):
        self.opacity = 0
        Animation(opacity=1, duration=1.2).start(self)

# ---------------- Dashboard Screen ----------------
class IconButton(ButtonBehavior, BoxLayout):
    def __init__(self, text="Feature", icon="images/admin.png", on_press_callback=None, **kwargs):
        super().__init__(orientation="vertical", spacing=10, **kwargs)
        self.on_press_callback = on_press_callback

        self.icon = Image(source=icon, size_hint=(None,None), size=(120,120), allow_stretch=True, pos_hint={"center_x":0.5})
        self.add_widget(self.icon)

        self.feature_label = Label(text=f"[b]{text}[/b]", markup=True, font_size=20,
                                   color=(1,1,1,1), size_hint=(1,None), height=30,
                                   halign="center", valign="middle")
        self.feature_label.bind(size=lambda *x: setattr(self.feature_label, "text_size", self.feature_label.size))
        self.add_widget(self.feature_label)

    def on_press(self):
        if self.on_press_callback:
            self.on_press_callback()

class DashboardScreen(FloatLayout):
    def __init__(self, switch_to_face=None, **kwargs):
        super().__init__(**kwargs)
        self.switch_to_face = switch_to_face
        self._build_ui()
        self._fade_in()

    def _build_ui(self):
        # Background
        self.bg_image = Image(source="images/bg.png", allow_stretch=True, keep_ratio=False, size_hint=(1,1))
        self.add_widget(self.bg_image)

        # Grid: 3 columns x 2 rows
        grid = GridLayout(cols=3, rows=2, spacing=20, padding=20,
                          size_hint=(0.9,0.7), pos_hint={"center_x":0.5,"center_y":0.5})

        def open_face_recognition():
            if self.switch_to_face:
                self.switch_to_face()

        features = [
            {"name":"Face Scan","icon":"images/face-scan.png","callback":open_face_recognition},
            {"name":"Users","icon":"images/users.png","callback":None},
            {"name":"Help","icon":"images/help.png","callback":None},
            {"name":"Reports","icon":"images/report.png","callback":None},
            {"name":"Settings","icon":"images/settings.png","callback":None},
            {"name":"Sign Out","icon":"images/sign-out.png","callback":None}
        ]

        for feature in features:
            grid.add_widget(IconButton(text=feature["name"], icon=feature["icon"], on_press_callback=feature["callback"]))

        self.add_widget(grid)

    def _fade_in(self):
        self.opacity = 0
        Animation(opacity=1, duration=1.2).start(self)

# ---------------- Face Recognition Screen ----------------

class FaceRecognitionScreen(Screen):
    RECOGNITION_THRESHOLD = 0.5  # similarity threshold

    def __init__(self, switch_to_dashboard=None, **kwargs):
        super().__init__(**kwargs)
        self.switch_to_dashboard = switch_to_dashboard

        # --- Background ---
        self.bg_image = Image(source="images/bg.png", allow_stretch=True, keep_ratio=False, size_hint=(1,1))
        self.add_widget(self.bg_image)

        # --- Title ---
        self.title = Label(text="[b]Attendance System[/b]", markup=True, font_size=28,
                           size_hint=(1,None), height=50, pos_hint={"top":1}, color=(1,1,1,1))
        self.add_widget(self.title)

        # --- Main layout ---
        self.main_layout = BoxLayout(
            orientation="horizontal",
            size_hint=(0.9, 0.7),
            pos_hint={"center_x": 0.5, "center_y": 0.55},
            spacing=20,
            padding=20
        )
        self.add_widget(self.main_layout)

        # --- Camera feed ---
        self.img = Image(size_hint=(0.65, 1), allow_stretch=True, keep_ratio=True)
        self.main_layout.add_widget(self.img)

        # --- Info card ---
        self.info_box = BoxLayout(orientation="vertical", size_hint=(0.35, 1), padding=15, spacing=10)
        self.main_layout.add_widget(self.info_box)

        with self.info_box.canvas.before:
            Color(0.1, 0.1, 0.3, 0.95)
            self.rect = RoundedRectangle(pos=self.info_box.pos, size=self.info_box.size, radius=[15])
            self.info_box.bind(pos=self.update_rect, size=self.update_rect)

        # --- Card title ---
        self.card_title = Label(text="[b]Student Info[/b]", markup=True, font_size=20,
                                size_hint=(1,None), height=40, color=(1,1,1,1))
        self.info_box.add_widget(self.card_title)

        # --- Student photo ---
        self.student_photo = Image(size_hint=(1, 0.5), allow_stretch=True, keep_ratio=True)
        self.info_box.add_widget(self.student_photo)

        # --- Info label ---
        self.info_label = Label(
            text="[b]System Active[/b]",
            markup=True,
            color=(1,1,1,1),
            halign="center",
            valign="middle",
            font_size=18
        )
        self.info_label.bind(size=lambda *x:setattr(self.info_label,'text_size',self.info_label.size))
        self.info_box.add_widget(self.info_label)

        # --- Registration fields ---
        self.first_input = TextInput(hint_text="First Name", size_hint=(1,None), height=40)
        self.last_input = TextInput(hint_text="Last Name", size_hint=(1,None), height=40)
        self.course_input = TextInput(hint_text="Course", size_hint=(1,None), height=40)
        self.section_input = TextInput(hint_text="Section", size_hint=(1,None), height=40)
        self.register_btn = Button(text="Register", size_hint=(1,None), height=40)
        self.register_btn.bind(on_release=self.register_new_student)

        # --- Back button ---
        self.back_btn = Button(text="Back", size_hint=(0.2,0.08),
                               pos_hint={"center_x":0.5,"y":0.02},
                               on_release=self.go_back)
        self.add_widget(self.back_btn)

        # --- DB connection ---
        try:
            self.conn = psycopg2.connect(host="localhost", database="Attendance-DB",
                                         user="postgres", password="xd123")
            self.cursor = self.conn.cursor()
        except Exception as e:
            self.info_label.text = f"DB Error: {e}"

        # --- Face detection ---
        self.face_app = FaceAnalysis()
        self.face_app.prepare(ctx_id=-1)

        self.cap = None
        self.clock_event = None
        self.current_embedding = None

    # --- Update rectangle ---
    def update_rect(self, *args):
        self.rect.pos = self.info_box.pos
        self.rect.size = self.info_box.size

    # --- Camera start/stop ---
    def on_enter(self):
        self.cap = cv2.VideoCapture(3)
        self.clock_event = Clock.schedule_interval(self.update, 1/30)

    def on_pre_leave(self):
        if self.clock_event:
            self.clock_event.cancel()
        if self.cap:
            self.cap.release()
            self.cap = None
        self.info_label.text = "[b]System Active[/b]"
        self.student_photo.texture = None
        self.clear_registration_fields()

    # --- Update camera feed ---
    def update(self, dt):
        if not self.cap:
            return
        ret, frame = self.cap.read()
        if not ret:
            return

        faces = self.face_app.get(frame)
        name_text = "Unknown"

        if faces:
            face = faces[0]
            box = face.bbox.astype(int)
            cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0,255,0), 2)

            embedding = face.embedding.astype(np.float32)
            self.current_embedding = embedding

            student = self.match_student(embedding)
            if student:
                name_text = f"{student[1]} {student[2]}"
                self.info_label.text = (
                    f"[b]{student[1]} {student[2]}[/b]\n\n"
                    f"Student ID: {student[0]}\n"
                    f"Course: {student[3]}\n"
                    f"Section: {student[4]}"
                )

                # Show stored face photo
                face_photo_bytes = student[6]
                if face_photo_bytes:
                    nparr = np.frombuffer(face_photo_bytes, np.uint8)
                    img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    buf = cv2.flip(img_np, 0).tobytes()
                    texture = Texture.create(size=(img_np.shape[1], img_np.shape[0]), colorfmt='bgr')
                    texture.blit_buffer(buf, colorfmt='bgr', bufferfmt='ubyte')
                    self.student_photo.texture = texture

                # Mark attendance
                self.log_attendance(student[0])

                self.clear_registration_fields()
            else:
                self.info_label.text = "[b]Face not recognized[/b]\nRegister below."
                self.student_photo.texture = None
                self.show_registration_fields()
        else:
            self.info_label.text = "[b]System Active[/b]"
            self.student_photo.texture = None
            self.clear_registration_fields()
            self.current_embedding = None

        # --- Draw name ---
        if faces:
            face = faces[0]
            box = face.bbox.astype(int)
            x1, y1, x2, y2 = box

            # Draw rectangle around the face
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Draw filled rectangle below for the name background
            rect_height = 25
            cv2.rectangle(frame, (x1, y2), (x2, y2 + rect_height), (0, 255, 0), -1)

            # Determine the text size and adjust font scale to fit
            max_width = x2 - x1 - 10  # 5px padding on each side
            font_scale = 0.6
            thickness = 1
            (text_width, text_height), _ = cv2.getTextSize(name_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
            
            # Reduce font scale if text is wider than the rectangle
            while text_width > max_width and font_scale > 0.1:
                font_scale -= 0.05
                (text_width, text_height), _ = cv2.getTextSize(name_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)

            # Draw the text starting from the left with small padding
            text_y = y2 + rect_height - 5
            cv2.putText(frame, name_text, (x1 + 5, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)


        # Update camera feed
        buf = cv2.flip(frame,0).tobytes()
        texture = Texture.create(size=(frame.shape[1], frame.shape[0]), colorfmt="bgr")
        texture.blit_buffer(buf, colorfmt="bgr", bufferfmt="ubyte")
        self.img.texture = texture

    # --- Match face ---
    def match_student(self, embedding):
        try:
            self.cursor.execute("SELECT student_id, first_name, last_name, course, section, face_embedding, face_photo FROM students")
            rows = self.cursor.fetchall()
            for row in rows:
                student_id, first_name, last_name, course, section, db_embedding, face_photo = row
                db_embedding = np.frombuffer(db_embedding, dtype=np.float32)
                sim = 1 - cosine(embedding, db_embedding)
                if sim >= self.RECOGNITION_THRESHOLD:
                    return row
            return None
        except Exception:
            return None

    # --- Attendance logging ---
    def log_attendance(self, student_id):
        try:
            # Check if attendance already recorded today
            self.cursor.execute("""
                SELECT id FROM attendance
                WHERE student_id = %s AND DATE(timestamp) = CURRENT_DATE
            """, (student_id,))
            already_logged = self.cursor.fetchone()

            if not already_logged:
                self.cursor.execute(
                    "INSERT INTO attendance (student_id) VALUES (%s)",
                    (student_id,)
                )
                self.conn.commit()
                self.info_label.text += "\n\nAttendance marked!"
            else:
                self.info_label.text += "\n\nAlready marked today."
        except Exception as e:
            self.info_label.text = f"DB Error: {e}"

    # --- Registration fields ---
    def show_registration_fields(self):
        for widget in [self.first_input, self.last_input, self.course_input, self.section_input, self.register_btn]:
            if not widget.parent:
                self.info_box.add_widget(widget)

    def clear_registration_fields(self):
        for widget in [self.first_input, self.last_input, self.course_input, self.section_input, self.register_btn]:
            if widget.parent:
                self.info_box.remove_widget(widget)

    # --- Register student ---
    def register_new_student(self, instance):
        if self.current_embedding is None:
            self.info_label.text = "No face detected to register."
            return

        first_name = self.first_input.text.strip()
        last_name = self.last_input.text.strip()
        course = self.course_input.text.strip()
        section = self.section_input.text.strip()

        if not all([first_name, last_name, course, section]):
            self.info_label.text = "Please fill all fields."
            return

        try:
            ret, frame = self.cap.read()
            if ret:
                faces = self.face_app.get(frame)
                if faces:
                    face = faces[0]
                    box = face.bbox.astype(int)
                    x1, y1, x2, y2 = box
                    face_crop = frame[y1:y2, x1:x2]
                    _, buffer = cv2.imencode('.jpg', face_crop)
                    face_bytes = buffer.tobytes()
                else:
                    face_bytes = None
            else:
                face_bytes = None

            self.cursor.execute(
                "INSERT INTO students (first_name, last_name, course, section, face_embedding, face_photo, created_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,NOW())",
                (first_name, last_name, course, section,
                 self.current_embedding.tobytes(), face_bytes)
            )
            self.conn.commit()

            self.info_label.text = f"{first_name} {last_name} registered successfully!"
            self.clear_registration_fields()

        except Exception as e:
            self.info_label.text = f"DB Error: {e}"

    # --- Back button ---
    def go_back(self, *args):
        if self.switch_to_dashboard:
            self.switch_to_dashboard()


# ---------------- Main App ----------------
class AttendanceApp(App):
    def build(self):
        sm = ScreenManager(transition=FadeTransition())

        # Welcome
        welcome_screen = Screen(name="welcome")
        welcome_screen.add_widget(WelcomeScreen(switch_callback=lambda:setattr(sm,"current","login")))
        sm.add_widget(welcome_screen)

        # Login
        login_screen = Screen(name="login")
        login_screen.add_widget(LoginScreen(switch_to_dashboard=lambda:setattr(sm,"current","dashboard")))
        sm.add_widget(login_screen)

        # Dashboard
        dashboard_screen = Screen(name="dashboard")
        dashboard_screen.add_widget(DashboardScreen(switch_to_face=lambda:setattr(sm,"current","face")))
        sm.add_widget(dashboard_screen)

        # Face Recognition
        face_screen = FaceRecognitionScreen(name="face",
        switch_to_dashboard=lambda: setattr(sm,"current","dashboard"))
        sm.add_widget(face_screen)

        sm.current = "welcome"
        return sm

if __name__=="__main__":
    AttendanceApp().run()
