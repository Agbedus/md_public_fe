export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
      <div className="relative w-10 h-10">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 left-1/2 w-[10%] h-[28%] -ml-[5%] bg-zinc-500 rounded-full opacity-[0.25] animate-spinner"
            style={{
              transform: `rotate(${i * 30}deg) translate(0, -140%)`,
              animationDelay: `-${1.2 - i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
