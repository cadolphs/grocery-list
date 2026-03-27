import { StapleItem } from '../types/domain';

type StapleTableProps = {
  readonly staples: StapleItem[];
};

const groupByArea = (staples: StapleItem[]): Map<string, StapleItem[]> => {
  const groups = new Map<string, StapleItem[]>();
  for (const staple of staples) {
    const existing = groups.get(staple.houseArea) ?? [];
    groups.set(staple.houseArea, [...existing, staple]);
  }
  return groups;
};

const formatAisle = (aisleNumber: number | null): string =>
  aisleNumber !== null ? String(aisleNumber) : '—';

const AreaSection = ({ area, items }: { area: string; items: StapleItem[] }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '0.25rem' }}>{area}</h2>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Section</th>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Aisle</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td style={{ padding: '0.5rem' }}>{item.name}</td>
            <td style={{ padding: '0.5rem' }}>{item.storeLocation.section}</td>
            <td style={{ padding: '0.5rem' }}>{formatAisle(item.storeLocation.aisleNumber)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const StapleTable = ({ staples }: StapleTableProps) => {
  if (staples.length === 0) {
    return <p>No staples yet</p>;
  }

  const grouped = groupByArea(staples);

  return (
    <div>
      {Array.from(grouped.entries()).map(([area, items]) => (
        <AreaSection key={area} area={area} items={items} />
      ))}
    </div>
  );
};
