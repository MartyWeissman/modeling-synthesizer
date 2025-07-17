// src/components/grid/GridTimePicker.jsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridTimePicker = ({
  x,
  y,
  value = "12:00 PM", // Default time in "HH:MM AM/PM" format
  onChange, // Callback when time changes

  // Standard props
  tooltip,
  theme,
}) => {
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState("PM");
  const [activeField, setActiveField] = useState(null); // 'hour', 'minute', 'period'
  const [blinkState, setBlinkState] = useState(true);
  const componentRef = useRef(null);

  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Parse initial value
  useEffect(() => {
    const parseTime = (timeStr) => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        return {
          hour: parseInt(match[1]),
          minute: parseInt(match[2]),
          period: match[3].toUpperCase(),
        };
      }
      return { hour: 12, minute: 0, period: "PM" };
    };

    const parsed = parseTime(value);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
  }, [value]);

  // Blinking animation for active field
  useEffect(() => {
    if (activeField) {
      const interval = setInterval(() => {
        setBlinkState((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setBlinkState(true);
    }
  }, [activeField]);

  // Handle time change and notify parent
  const updateTime = useCallback(
    (hour, minute, period) => {
      const newTime = `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
      onChange?.(newTime);
    },
    [onChange],
  );

  const adjustHour = useCallback(
    (direction) => {
      let newHour = selectedHour;
      let newPeriod = selectedPeriod;

      if (direction === 1) {
        // Going up
        if (selectedHour === 11) {
          // 11 AM → 12 PM, 11 PM → 12 AM
          newHour = 12;
          newPeriod = selectedPeriod === "AM" ? "PM" : "AM";
        } else if (selectedHour === 12) {
          // 12 AM → 1 AM, 12 PM → 1 PM
          newHour = 1;
        } else {
          // Normal increment
          newHour = selectedHour + 1;
        }
      } else {
        // Going down
        if (selectedHour === 1) {
          // 1 AM → 12 AM, 1 PM → 12 PM
          newHour = 12;
        } else if (selectedHour === 12) {
          // 12 AM → 11 PM, 12 PM → 11 AM
          newHour = 11;
          newPeriod = selectedPeriod === "AM" ? "PM" : "AM";
        } else {
          // Normal decrement
          newHour = selectedHour - 1;
        }
      }

      setSelectedHour(newHour);
      setSelectedPeriod(newPeriod);
      updateTime(newHour, selectedMinute, newPeriod);
    },
    [selectedHour, selectedMinute, selectedPeriod, updateTime],
  );

  const adjustMinute = useCallback(
    (direction) => {
      let newMinute = selectedMinute + direction * 15; // 15-minute increments
      if (newMinute >= 60) newMinute = 0;
      if (newMinute < 0) newMinute = 45;
      setSelectedMinute(newMinute);
      updateTime(selectedHour, newMinute, selectedPeriod);
    },
    [selectedHour, selectedMinute, selectedPeriod, updateTime],
  );

  const togglePeriod = useCallback(() => {
    const newPeriod = selectedPeriod === "AM" ? "PM" : "AM";
    setSelectedPeriod(newPeriod);
    updateTime(selectedHour, selectedMinute, newPeriod);
  }, [selectedHour, selectedMinute, selectedPeriod, updateTime]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeField) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeField === "hour") adjustHour(1);
        else if (activeField === "minute") adjustMinute(1);
        else if (activeField === "period") togglePeriod();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeField === "hour") adjustHour(-1);
        else if (activeField === "minute") adjustMinute(-1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        if (activeField === "period") togglePeriod();
      } else if (e.key === "Escape") {
        setActiveField(null);
      } else if (activeField === "hour" && /^[1-9]$/.test(e.key)) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 12) {
          setSelectedHour(num);
          updateTime(num, selectedMinute, selectedPeriod);
        }
      } else if (activeField === "period" && /^[apAP]$/.test(e.key)) {
        const newPeriod = e.key.toLowerCase() === "a" ? "AM" : "PM";
        setSelectedPeriod(newPeriod);
        updateTime(selectedHour, selectedMinute, newPeriod);
      }
    };

    if (activeField) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    activeField,
    adjustHour,
    adjustMinute,
    togglePeriod,
    updateTime,
    selectedHour,
    selectedMinute,
    selectedPeriod,
  ]);

  // Click outside to deactivate
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target)
      ) {
        setActiveField(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={componentRef}>
      <GridComponent
        x={x}
        y={y}
        w={1}
        h={1}
        title={tooltip}
        theme={theme}
        className="p-1.5 select-none"
        style={{
          background: isUnicornMode
            ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,207,232,0.3) 50%, rgba(196,181,253,0.3) 100%), url(${currentTexture})`
            : `url(${currentTexture})`,
          backgroundSize: "cover, 64px 64px",
          boxShadow: isUnicornMode
            ? `
                inset 0 1px 0 0 rgba(255,255,255,0.3),
                inset 1px 0 0 0 rgba(255,255,255,0.2),
                inset 0 -1px 0 0 rgba(236,72,153,0.1),
                inset -1px 0 0 0 rgba(236,72,153,0.1),
                0 2px 8px rgba(236,72,153,0.2)
              `
            : `
                inset 0 1px 0 0 rgba(255,255,255,0.1),
                inset 1px 0 0 0 rgba(255,255,255,0.05),
                inset 0 -1px 0 0 rgba(0,0,0,0.1),
                inset -1px 0 0 0 rgba(0,0,0,0.05),
                0 2px 4px rgba(0,0,0,0.1)
              `,
          border: isUnicornMode
            ? "1px solid rgba(236,72,153,0.2)"
            : "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="w-full h-full rounded-sm flex items-center justify-center relative"
          style={{
            background: isUnicornMode
              ? `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(251,207,232,0.2) 100%), url(${currentTexture})`
              : `url(${currentTexture})`,
            backgroundSize: "cover, 64px 64px",
            boxShadow: isUnicornMode
              ? `
                  inset 2px 2px 4px rgba(236,72,153,0.1),
                  inset -1px -1px 2px rgba(255,255,255,0.3)
                `
              : `
                  inset 2px 2px 4px rgba(0,0,0,0.15),
                  inset -1px -1px 2px rgba(255,255,255,0.1)
                `,
            border: isUnicornMode
              ? "1px solid rgba(236,72,153,0.2)"
              : "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {/* Up/down arrows for hour */}
          {activeField === "hour" && (
            <div
              className="absolute left-1"
              style={{ top: "calc(50% - 20px)" }}
            >
              <div className="flex flex-col gap-0.5">
                <button
                  className={`w-3 h-3 flex items-center justify-center text-xs ${isUnicornMode ? "text-purple-800" : theme.text} hover:opacity-70`}
                  onClick={() => adjustHour(1)}
                >
                  ▲
                </button>
                <button
                  className={`w-3 h-3 flex items-center justify-center text-xs ${isUnicornMode ? "text-purple-800" : theme.text} hover:opacity-70`}
                  onClick={() => adjustHour(-1)}
                >
                  ▼
                </button>
              </div>
            </div>
          )}

          {/* Up/down arrows for minute */}
          {activeField === "minute" && (
            <div
              className="absolute right-1"
              style={{ top: "calc(50% - 20px)" }}
            >
              <div className="flex flex-col gap-0.5">
                <button
                  className={`w-3 h-3 flex items-center justify-center text-xs ${theme.text} hover:opacity-70`}
                  onClick={() => adjustMinute(1)}
                >
                  ▲
                </button>
                <button
                  className={`w-3 h-3 flex items-center justify-center text-xs ${theme.text} hover:opacity-70`}
                  onClick={() => adjustMinute(-1)}
                >
                  ▼
                </button>
              </div>
            </div>
          )}

          {/* Left/right arrows for AM/PM */}
          {activeField === "period" && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
              <div className="flex gap-1">
                <button
                  className={`w-3 h-3 flex items-center justify-center text-xs ${theme.text} hover:opacity-70`}
                  onClick={() => togglePeriod()}
                >
                  ◀
                </button>
                <button
                  className={`w-3 h-3 flex items-center justify-center text-xs ${theme.text} hover:opacity-70`}
                  onClick={() => togglePeriod()}
                >
                  ▶
                </button>
              </div>
            </div>
          )}

          {/* Time Display */}
          <div
            className={`flex flex-col items-center justify-center ${theme.text} font-thin`}
          >
            <div className="flex items-baseline">
              {/* Hour */}
              <span
                className={`text-lg cursor-pointer ${activeField === "hour" && !blinkState ? "opacity-20" : "opacity-100"}`}
                onClick={() => setActiveField("hour")}
              >
                {selectedHour}
              </span>

              {/* Colon */}
              <span className="text-lg mx-0.5">:</span>

              {/* Minute */}
              <span
                className={`text-lg cursor-pointer ${activeField === "minute" && !blinkState ? "opacity-20" : "opacity-100"}`}
                onClick={() => setActiveField("minute")}
              >
                {selectedMinute.toString().padStart(2, "0")}
              </span>
            </div>

            {/* AM/PM */}
            <span
              className={`text-xs mt-0.5 cursor-pointer ${activeField === "period" && !blinkState ? "opacity-20" : "opacity-100"}`}
              onClick={() => setActiveField("period")}
            >
              {selectedPeriod}
            </span>
          </div>
        </div>
      </GridComponent>
    </div>
  );
};

export default GridTimePicker;
