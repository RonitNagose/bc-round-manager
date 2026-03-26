export default function LowBidDisplay({ value }: { value: number }) {
  return (
    <div>
      <div className="metric-label">Current Lowest Bid</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
