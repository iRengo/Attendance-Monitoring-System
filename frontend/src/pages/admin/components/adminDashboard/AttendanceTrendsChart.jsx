import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { db } from "../../../../firebase";
import { collection, onSnapshot } from "firebase/firestore";

// Fixed Mon–Fri axis
const MON_TO_FRI = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Compute weekday from ISO-like string by date-part only (avoid TZ shifts)
function weekdayFromISODateString(isoLike) {
  if (typeof isoLike !== "string") return null;
  const match = isoLike.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  const wd = dt.getUTCDay(); // 0..6
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][wd] || null;
}

// YYYY-MM-DD from ISO-like string (first 10 chars), fallback to null
function dateKeyFromISO(isoLike) {
  if (typeof isoLike !== "string") return null;
  const m = isoLike.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function normalizeDaysField(daysStr) {
  if (!daysStr || typeof daysStr !== "string") return [];
  return daysStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const lower = s.toLowerCase();
      if (lower.startsWith("mon")) return "Monday";
      if (lower.startsWith("tue")) return "Tuesday";
      if (lower.startsWith("wed")) return "Wednesday";
      if (lower.startsWith("thu")) return "Thursday";
      if (lower.startsWith("fri")) return "Friday";
      if (lower.startsWith("sat")) return "Saturday";
      if (lower.startsWith("sun")) return "Sunday";
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    });
}

// Build YYYY-MM-DD keys for a rolling last N days window (today inclusive)
function buildRollingDateKeys(days) {
  const keys = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push(toDateKeyLocal(d));
  }
  return new Set(keys);
}

// Build YYYY-MM-DD keys for current calendar week (Mon–Sun)
function buildCurrentWeekKeys() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  monday.setHours(0, 0, 0, 0);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    keys.push(toDateKeyLocal(d));
  }
  return new Set(keys);
}

function toDateKeyLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Props:
 * - rangeMode: 'rolling' | 'week'
 *   'rolling' = last N days (windowDays), default 7
 *   'week'    = current calendar week (Mon–Sun)
 * - windowDays: number of days for rolling mode (default 7)
 */
export default function AttendanceTrendsChart({
  className = "",
  rangeMode = "rolling",
  windowDays = 7,
}) {
  const [series, setSeries] = useState([]);
  const [classesDaysMap, setClassesDaysMap] = useState({}); // classId -> Set of days
  const [classesLoaded, setClassesLoaded] = useState(false);

  // Live load all classes to build classId -> allowedDays map
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "classes"),
      (snap) => {
        const next = {};
        snap.docs.forEach((d) => {
          const data = d.data() || {};
          const daysArr = normalizeDaysField(data.days);
          next[d.id] = new Set(daysArr);
        });
        setClassesDaysMap(next);
        setClassesLoaded(true);
      },
      (err) => {
        console.error("classes listener error:", err);
        setClassesDaysMap({});
        setClassesLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  // Precompute allowed date keys for the chosen window
  const allowedDateKeys = useMemo(() => {
    if (rangeMode === "week") return buildCurrentWeekKeys();
    return buildRollingDateKeys(Math.max(1, windowDays || 7));
  }, [rangeMode, windowDays]);

  // For the header text
  const rangeDays = useMemo(() => {
    return rangeMode === "week" ? 7 : Math.max(1, windowDays || 7);
  }, [rangeMode, windowDays]);

  // Aggregate studentsPresent by weekday (Mon–Fri) across attendance_sessions, within the window
  useEffect(() => {
    if (!classesLoaded) return; // wait for class days to load

    const unsub = onSnapshot(
      collection(db, "attendance_sessions"),
      (snap) => {
        try {
          // Initialize counters for Mon–Fri
          const counts = MON_TO_FRI.reduce((acc, day) => {
            acc[day] = 0;
            return acc;
          }, {});

          snap.docs.forEach((docSnap) => {
            const s = docSnap.data() || {};
            const clsId = s.classId;
            if (!clsId) return;

            // Ensure classId exists in classes map and has days
            const allowedDays = classesDaysMap[clsId];
            if (!allowedDays || allowedDays.size === 0) return;

            // Derive weekday and date key from the session’s date/time strings
            const src =
              (typeof s.date === "string" && s.date) ||
              (typeof s.timeStarted === "string" && s.timeStarted) ||
              (typeof s.timeEnded === "string" && s.timeEnded) ||
              null;
            if (!src) return;

            const weekday = weekdayFromISODateString(src);
            const dateKey = dateKeyFromISO(src);
            if (!weekday || !dateKey) return;

            // Filter by window and Mon–Fri and class’s scheduled days
            if (!allowedDateKeys.has(dateKey)) return;
            if (!MON_TO_FRI.includes(weekday)) return;
            if (!allowedDays.has(weekday)) return;

            // STRICT: only studentsPresent counts
            const presentCount = Array.isArray(s.studentsPresent) ? s.studentsPresent.length : 0;
            counts[weekday] += presentCount;
          });

          const data = MON_TO_FRI.map((day) => ({
            name: day,
            present: counts[day],
          }));
          setSeries(data);
        } catch (e) {
          console.error("aggregate weekly Mon–Fri error:", e);
          setSeries(MON_TO_FRI.map((day) => ({ name: day, present: 0 })));
        }
      },
      (err) => {
        console.error("attendance_sessions listener error:", err);
        setSeries(MON_TO_FRI.map((day) => ({ name: day, present: 0 })));
      }
    );
    return () => unsub();
  }, [classesLoaded, classesDaysMap, allowedDateKeys]);

  // Dynamic Y domain with padding
  const yDomain = useMemo(() => {
    if (!series?.length) return [0, 10];
    const vals = series.map((d) => Number(d.present) || 0);
    const max = Math.max(5, Math.max(...vals, 0));
    const pad = Math.ceil(max * 0.1);
    return [0, max + pad];
  }, [series]);

  return (
    <div className={`bg-white border rounded-xl shadow-md p-5 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-800">
        📈 Attendance Trends ( Weekly )
      </h2>
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={yDomain} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="present"
              name="Present"
              stroke="#16a34a"
              strokeWidth={3}
              activeDot={{ r: 7 }}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}