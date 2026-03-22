@import "tailwindcss";

@layer base {
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1) brightness(0.8) sepia(100%) saturate(10000%) hue-rotate(45deg);
    cursor: pointer;
  }

  input[type="date"]::-webkit-datetime-edit-text,
  input[type="date"]::-webkit-datetime-edit-month-field,
  input[type="date"]::-webkit-datetime-edit-day-field,
  input[type="date"]::-webkit-datetime-edit-year-field {
    color: inherit;
  }
}
