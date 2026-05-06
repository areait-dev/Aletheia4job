function JobInfo({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className='flex gap-x-2 items-center text-sm font-medium'>
      <div className='text-primary/70 shrink-0'>
        {icon}
      </div>
      <span className='truncate'>{text}</span>
    </div>
  );
}
export default JobInfo;
