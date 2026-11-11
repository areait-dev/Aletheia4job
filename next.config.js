/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
    },
    // Vecchi URL in inglese -> nuovi URL in italiano (segnalibri e link già condivisi).
    async redirects() {
        const map = {
            'add-candidate': 'nuovo-candidato', jobs: 'archivio',
            positions: 'posizioni', pipeline: 'selezione', stats: 'statistiche',
            calendar: 'calendario', attendance: 'presenze', documents: 'documenti',
            employees: 'dipendenti', onboarding: 'inserimento', performance: 'valutazioni',
            admin: 'amministrazione', invite: 'invito',
        };
        return [
            { source: '/positions/new', destination: '/posizioni/nuova', permanent: true },
            { source: '/positions/:id/edit', destination: '/posizioni/:id/modifica', permanent: true },
            { source: '/jobs/:id/edit', destination: '/archivio/:id/modifica', permanent: true },
            ...Object.entries(map).flatMap(([from, to]) => [
                { source: `/${from}`, destination: `/${to}`, permanent: true },
                { source: `/${from}/:path*`, destination: `/${to}/:path*`, permanent: true },
            ]),
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
        ],
    },
}

module.exports = nextConfig
