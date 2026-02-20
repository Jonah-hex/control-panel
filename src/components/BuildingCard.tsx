import React, { ReactNode, useState } from "react";

interface BuildingCardProps {
  title: string;
  icon: ReactNode;
  gradient?: string; // tailwind gradient classes
  iconColor?: string; // tailwind text color
  children: ReactNode;
  defaultOpen?: boolean;
}

const BuildingCard: React.FC<BuildingCardProps> = ({
  title,
  icon,
  gradient = "from-indigo-400 to-indigo-600",
  iconColor = "text-white",
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
      <button
        className="flex flex-col items-center w-full focus:outline-none mb-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className={`flex items-center justify-center rounded-full mb-2 h-16 w-16 bg-gradient-to-br ${gradient} shadow-lg transition-all duration-200`}
        >
          <span className={iconColor + " text-3xl"}>{icon}</span>
        </span>
        <span className="text-lg font-bold text-indigo-700 text-center">{title}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
};

export default BuildingCard;
