"use client";

import React, { useState } from "react";

interface TimePickerProps {
    onSelect: (time: string) => void;
    selectedTime?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ onSelect, selectedTime }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    // Generate time slots in 30-min intervals
    const generateTimeSlots = () => {
        const slots: string[] = [];
        for (let hour = 10; hour <= 22; hour++) { // 10 AM to 10 PM
            for (let min = 0; min < 60; min += 30) {
                let displayHour = hour % 12 === 0 ? 12 : hour % 12; // 12-hour format
                const displayMin = min.toString().padStart(2, "0");
                const ampm = hour < 12 ? "AM" : "PM";
                slots.push(`${displayHour}:${displayMin} ${ampm}`);
            }
        }
        return slots;
    };



    const timeSlots = generateTimeSlots();

    return (
        <div className="relative w-48">
            <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full border p-2 rounded text-left dark:text-black"
            >
                {selectedTime || "Select time"}
            </button>

            {showDropdown && (
                <div className="absolute z-10 w-full max-h-60 overflow-y-auto border rounded bg-white mt-1">
                    {timeSlots.map((time) => (
                        <div
                            key={time}
                            className={`p-2 cursor-pointer hover:bg-pink-100 dark:text-black ${selectedTime === time ? "bg-pink-200 font-bold" : ""
                                }`}
                            onClick={() => {
                                onSelect(time);
                                setShowDropdown(false);
                            }}
                        >
                            {time}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimePicker;
