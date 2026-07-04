import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { useTranslation } from 'react-i18next';
import { mapImageUrl } from '../utils/assetUrl';

export interface MapPoint {
    id: string;
    x: number;
    z: number;
}

interface SpawnMapCanvasProps {
    mapSize: number;
    mapImagePath: string | null;
    points: MapPoint[];
    selectedId: string | null;
    onAddPoint: (x: number, z: number) => void;
    onMovePoint: (id: string, x: number, z: number) => void;
    onSelectPoint: (id: string) => void;
    hint?: string;
}

const WORLD_UNITS = 1000;
const MIN_VIEW = WORLD_UNITS / 20;
const DRAG_THRESHOLD_PX = 4;

interface ViewBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

const FULL_VIEW: ViewBox = { x: 0, y: 0, w: WORLD_UNITS, h: WORLD_UNITS };

const clampViewBox = (vb: ViewBox): ViewBox => {
    const w = Math.min(Math.max(vb.w, MIN_VIEW), WORLD_UNITS);
    const h = Math.min(Math.max(vb.h, MIN_VIEW), WORLD_UNITS);
    const x = Math.min(Math.max(vb.x, 0), WORLD_UNITS - w);
    const y = Math.min(Math.max(vb.y, 0), WORLD_UNITS - h);
    return { x, y, w, h };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Переиспользуемая карта спавнов: SVG с фоном-картой (dayzasset://), зум колесом, панорама
// перетаскиванием пустого места, добавление точки кликом, перетаскивание существующих точек.
// Координаты мира (0..mapSize, Z «на север») ↔ внутренние координаты SVG (0..WORLD_UNITS).
export const SpawnMapCanvas = ({
    mapSize,
    mapImagePath,
    points,
    selectedId,
    onAddPoint,
    onMovePoint,
    onSelectPoint,
    hint,
}: SpawnMapCanvasProps) => {
    const { t } = useTranslation();
    const [viewBox, setViewBox] = useState<ViewBox>(FULL_VIEW);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [squareSize, setSquareSize] = useState(0);

    // flex:1 в обе стороны делает и ширину, и высоту контейнера «явными», из-за чего CSS
    // aspect-ratio не применяется (работает только когда одна из сторон auto) — поэтому
    // квадратный размер карты вычисляем сами по меньшей стороне доступного места.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setSquareSize(Math.max(Math.floor(Math.min(width, height)), 0));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    const draggingPointId = useRef<string | null>(null);
    const panState = useRef<{ mode: 'idle' | 'maybe' | 'pan'; sx: number; sy: number; vb: ViewBox }>({
        mode: 'idle',
        sx: 0,
        sy: 0,
        vb: FULL_VIEW,
    });

    const worldToSvg = (x: number, z: number) => ({
        sx: (x / mapSize) * WORLD_UNITS,
        sy: WORLD_UNITS - (z / mapSize) * WORLD_UNITS,
    });
    const svgToWorld = (sx: number, sy: number) => ({
        x: (sx / WORLD_UNITS) * mapSize,
        z: ((WORLD_UNITS - sy) / WORLD_UNITS) * mapSize,
    });

    const getSvgPoint = (clientX: number, clientY: number) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return { sx: 0, sy: 0 };
        return {
            sx: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w,
            sy: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h,
        };
    };

    const zoomBy = (scaleFactor: number, clientX?: number, clientY?: number) => {
        const { sx, sy } =
            clientX !== undefined && clientY !== undefined
                ? getSvgPoint(clientX, clientY)
                : { sx: viewBox.x + viewBox.w / 2, sy: viewBox.y + viewBox.h / 2 };
        setViewBox((prev) => {
            const w = Math.min(Math.max(prev.w * scaleFactor, MIN_VIEW), WORLD_UNITS);
            const h = Math.min(Math.max(prev.h * scaleFactor, MIN_VIEW), WORLD_UNITS);
            return clampViewBox({ x: sx - (sx - prev.x) * (w / prev.w), y: sy - (sy - prev.y) * (h / prev.h), w, h });
        });
    };

    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        zoomBy(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    };

    const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (draggingPointId.current) return;
        panState.current = { mode: 'maybe', sx: e.clientX, sy: e.clientY, vb: viewBox };
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (draggingPointId.current) {
            const { sx, sy } = getSvgPoint(e.clientX, e.clientY);
            const { x, z } = svgToWorld(sx, sy);
            onMovePoint(draggingPointId.current, round2(x), round2(z));
            return;
        }
        const ps = panState.current;
        if (ps.mode === 'idle') return;
        const dx = e.clientX - ps.sx;
        const dy = e.clientY - ps.sy;
        if (ps.mode === 'maybe') {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
            panState.current.mode = 'pan';
        }
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        setViewBox(
            clampViewBox({
                x: ps.vb.x - dx * (ps.vb.w / rect.width),
                y: ps.vb.y - dy * (ps.vb.h / rect.height),
                w: ps.vb.w,
                h: ps.vb.h,
            })
        );
    };

    const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (draggingPointId.current) {
            draggingPointId.current = null;
            return;
        }
        if (panState.current.mode === 'maybe') {
            const { sx, sy } = getSvgPoint(e.clientX, e.clientY);
            const { x, z } = svgToWorld(sx, sy);
            onAddPoint(round2(x), round2(z));
        }
        panState.current.mode = 'idle';
    };

    const gridLines = [0, 0.25, 0.5, 0.75, 1];
    const pointR = (sel: boolean) => Math.max((sel ? 6 : 4) * (viewBox.w / WORLD_UNITS), 1.5);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    {hint ?? t('spawnMap.hint')}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="+">
                        <IconButton size="small" onClick={() => zoomBy(1 / 1.4)}>
                            <ZoomInIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="-">
                        <IconButton size="small" onClick={() => zoomBy(1.4)}>
                            <ZoomOutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('spawnMap.resetView')}>
                        <IconButton size="small" onClick={() => setViewBox(FULL_VIEW)}>
                            <CenterFocusStrongIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>
            <Box ref={containerRef} sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box
                    sx={{
                        width: squareSize,
                        height: squareSize,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                    }}
                >
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                    style={{ background: '#20261f', cursor: 'crosshair', touchAction: 'none', display: 'block' }}
                    onWheel={handleWheel}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                >
                    {mapImagePath ? (
                        <image href={mapImageUrl(mapImagePath)} x={0} y={0} width={WORLD_UNITS} height={WORLD_UNITS} preserveAspectRatio="none" />
                    ) : (
                        gridLines.map((g) => (
                            <React.Fragment key={g}>
                                <line x1={g * WORLD_UNITS} y1={0} x2={g * WORLD_UNITS} y2={WORLD_UNITS} stroke="currentColor" strokeOpacity={0.15} />
                                <line x1={0} y1={g * WORLD_UNITS} x2={WORLD_UNITS} y2={g * WORLD_UNITS} stroke="currentColor" strokeOpacity={0.15} />
                            </React.Fragment>
                        ))
                    )}
                    <rect x={0.5} y={0.5} width={WORLD_UNITS - 1} height={WORLD_UNITS - 1} fill="none" stroke="currentColor" strokeOpacity={0.4} />
                    {points.map((p) => {
                        const { sx, sy } = worldToSvg(p.x, p.z);
                        const sel = p.id === selectedId;
                        return (
                            <circle
                                key={p.id}
                                cx={sx}
                                cy={sy}
                                r={pointR(sel)}
                                fill={sel ? '#f44336' : '#2196f3'}
                                stroke="#fff"
                                strokeWidth={Math.max(0.5 * (viewBox.w / WORLD_UNITS), 0.3)}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    draggingPointId.current = p.id;
                                    onSelectPoint(p.id);
                                }}
                                style={{ cursor: 'move' }}
                            />
                        );
                    })}
                </svg>
                </Box>
            </Box>
        </Box>
    );
};
