// Nervefeyn 终端侧边栏 · Pi TUI overlay
// 在宽终端(≥100列)时显示左侧浮动侧边栏:品牌 + 导航 + 状态

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { visibleWidth } from "@earendil-works/pi-tui";

import { FEYNMAN_VERSION } from "./shared.js";

// 侧边栏组件
class SidebarComponent implements Component {
	private tui: TUI;
	private theme: { fg: (token: string, text: string) => string; bold: (text: string) => string };
	private done: () => void;
	private cwd: string = "";

	constructor(tui: TUI, theme: { fg: (token: string, text: string) => string; bold: (text: string) => string }, done: () => void) {
		this.tui = tui;
		this.theme = theme;
		this.done = done;
	}

	invalidate(): void {
		this.tui.requestRender();
	}

	handleInput(data: string): void {
		if (data === "\x1b") {
			this.done();
		}
	}

	render(width: number): string[] {
		const th = this.theme;
		const innerW = Math.max(1, width - 2);
		const fill = (s: string) => s + " ".repeat(Math.max(0, innerW - visibleWidth(s)));
		const lines: string[] = [];

		// 品牌区
		lines.push(fill(th.fg("accent", " Nervefeyn")));
		lines.push(fill(th.fg("dim", " 神经计算研究")));
		lines.push(fill(th.fg("borderMuted", "─".repeat(innerW))));

		// 导航
		const navItems = ["会话", "文件", "配置"];
		for (const item of navItems) {
			lines.push(fill(` ${th.fg("text", item)}`));
		}

		lines.push(fill(th.fg("borderMuted", "─".repeat(innerW))));

		// 项目
		lines.push(fill(th.fg("dim", " PROJECT")));
		const projectName = this.cwd.split("/").pop() || "workspace";
		lines.push(fill(` ${th.fg("accent", "●")} ${th.fg("text", projectName)}`));

		lines.push(fill(th.fg("borderMuted", "─".repeat(innerW))));

		// 状态
		lines.push(fill(th.fg("dim", " STATUS")));
		lines.push(fill(` ${th.fg("success", "●")} Ready`));
		lines.push(fill(` ${th.fg("dim", "v" + FEYNMAN_VERSION)}`));

		lines.push(fill(th.fg("borderMuted", "─".repeat(innerW))));

		// 提示
		lines.push(fill(th.fg("dim", " Ctrl+B toggle")));

		return lines;
	}
}

// Component 接口最小定义(避免依赖 pi-tui 内部类型)
interface Component {
	render(width: number): string[];
	handleInput?(data: string): void;
	invalidate?(): void;
}

export default function registerSidebar(pi: ExtensionAPI): void {
	let sidebarVisible = true;
	let sidebarHandle: { setHidden: (b: boolean) => void; hide: () => void } | null = null;

	pi.on("session_start", async (_event: unknown, _ctx: ExtensionContext) => {
		// 创建侧边栏 overlay
		await _ctx.ui.custom<void>(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(tui: TUI, theme: any, _kb: unknown, done: () => void) => {
				const component = new SidebarComponent(tui, theme, done);
				try {
					(component as unknown as { cwd: string }).cwd = process.cwd();
				} catch {
					// 忽略
				}
				return component;
			},
			{
				overlay: true,
				overlayOptions: {
					anchor: "top-left" as const,
					width: 22,
					minWidth: 18,
					margin: { top: 0, right: 1, bottom: 0, left: 0 } as const,
					visible: (termWidth: number, _termHeight: number) => termWidth >= 100,
					nonCapturing: true,
				},
				onHandle: (handle: { setHidden: (b: boolean) => void; hide: () => void }) => {
					sidebarHandle = handle;
					if (!sidebarVisible) {
						handle.setHidden(true);
					}
				},
			},
		);
	});

	pi.registerShortcut("ctrl+b", {
		description: "切换侧边栏",
		handler: async (_ctx: ExtensionContext) => {
			if (sidebarHandle) {
				sidebarVisible = !sidebarVisible;
				sidebarHandle.setHidden(!sidebarVisible);
			}
		},
	});
}
