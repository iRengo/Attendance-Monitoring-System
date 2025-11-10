import { Calendar } from "lucide-react";

export default function IncomingClassCard({ incomingClass }) {
  return (
    <div className="md:w-96 bg-white border rounded-xl shadow-md p-5 flex flex-col justify-center items-center hover:shadow-lg transition text-center">
      <Calendar size={40} className="text-amber-500 mb-3" />
      <h2 className="text-sm font-medium text-gray-700">Incoming Class</h2>

      {incomingClass ? (
        <>
          <p className="text-lg font-bold mt-1 text-gray-900">{incomingClass.subjectName}</p>
          <p className="mt-1 text-sm text-gray-600">
            {incomingClass.dayLabel} • {incomingClass.time}
          </p>
          {incomingClass.roomNumber && (
            <p className="mt-1 text-xs text-gray-500">
              Room {incomingClass.roomNumber} • {incomingClass.section}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 mt-2">No upcoming classes</p>
      )}
    </div>
  );
}