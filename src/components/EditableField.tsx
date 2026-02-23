import React from "react";

interface EditableFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  inputClassName?: string;
  labelClassName?: string;
  wrapperClassName?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, value, onChange, type = "text", icon, disabled, inputClassName, labelClassName, wrapperClassName }) => {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName ?? "mb-3"}`}>
      <label className={`text-sm font-semibold text-gray-700 flex items-center gap-1 mb-1 ${labelClassName ?? ""}`}>
        {icon && <span className="text-base text-indigo-400">{icon}</span>}
        {label}
      </label>
      <input
        className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm w-full ${disabled ? '' : (typeof inputClassName === 'string' ? inputClassName : '')}`}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
};

export default EditableField;
