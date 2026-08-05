import React from 'react';
import ReactDOM from 'react-dom';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './DatePickerPortal.css';

const DatePickerPortal = ({ isOpen, position, value, onChange, onClose }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0"
      onClick={onClose}
    >
      <div
        className="datepicker-container absolute"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <DatePicker
          closeOnScroll={true}
          selected={value ? new Date(value) : new Date()}
          onChange={(date) => {
            onChange(date);
            onClose();
          }}
          inline
          dateFormat="MMM dd, yyyy"
          calendarClassName="shadow-lg"
        />
      </div>
    </div>,
    document.body
  );
};

export default DatePickerPortal;