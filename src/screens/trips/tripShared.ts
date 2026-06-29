export const AVATAR_PALETTE = [
    '#7F77DD',
    '#D85A30',
    '#1D9E75',
    '#D4537E',
    '#E89B23',
    '#3B82F6',
];

export function avatarColor(lineUserId: string): string {
    return AVATAR_PALETTE[
        (lineUserId.charCodeAt(1) || 0) % AVATAR_PALETTE.length
    ];
}