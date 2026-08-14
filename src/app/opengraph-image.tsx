import { ImageResponse } from 'next/og';

export const alt = 'MyndDesk — focused team attendance and work management';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#090a0c',
          color: '#ffffff',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'rgba(52, 211, 153, 0.13)',
            borderRadius: 400,
            display: 'flex',
            height: 560,
            left: -180,
            position: 'absolute',
            top: -260,
            width: 560,
          }}
        />
        <div
          style={{
            background: 'rgba(129, 140, 248, 0.1)',
            borderRadius: 400,
            bottom: -300,
            display: 'flex',
            height: 620,
            position: 'absolute',
            right: -160,
            width: 620,
          }}
        />
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 980,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              fontSize: 30,
              fontWeight: 700,
              gap: 16,
              letterSpacing: '-0.02em',
              marginBottom: 42,
            }}
          >
            <div
              style={{
                background: '#34d399',
                borderRadius: 15,
                display: 'flex',
                height: 48,
                width: 48,
              }}
            />
            MyndDesk
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 68,
              fontWeight: 750,
              letterSpacing: '-0.045em',
              lineHeight: 1.05,
            }}
          >
            Track the work that matters.
          </div>
          <div
            style={{
              color: '#a1a1aa',
              display: 'flex',
              fontSize: 28,
              lineHeight: 1.4,
              marginTop: 28,
            }}
          >
            Attendance, tasks, projects and time off for growing teams.
          </div>
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 999,
              color: '#6ee7b7',
              display: 'flex',
              fontSize: 20,
              marginTop: 46,
              padding: '13px 24px',
            }}
          >
            Built for Africa. Ready for teams everywhere.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
