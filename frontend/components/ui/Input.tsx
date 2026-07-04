import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const BASE =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none transition focus:border-brand placeholder:text-gray-500";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${BASE} ${className}`} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`${BASE} ${className}`} {...rest} />;
}
