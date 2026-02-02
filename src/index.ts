/**
 * 入口文件
 *
 * 本文件为默认扩展入口文件，如果你想要配置其它文件作为入口文件，
 * 请修改 `extension.json` 中的 `entry` 字段；
 *
 * 请在此处使用 `export`  导出所有你希望在 `headerMenus` 中引用的方法，
 * 方法通过方法名与 `headerMenus` 关联。
 *
 * 如需了解更多开发细节，请阅读：
 * https://prodocs.lceda.cn/cn/api/guide/
 */
import * as extensionConfig from '../extension.json';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {}

const openPage = async (name: string, width: number, height: number) => {
	const config = await eda.sys_Storage.setExtensionAllUserConfigs({
		...eda.sys_Storage.getExtensionAllUserConfigs(),
		[extensionConfig.name]: name,
	});
	if (config) {
		eda.sys_IFrame.openIFrame('/vue-dist/index.html', width, height, name);
	}
};

export async function set(): Promise<void> {
	await openPage('First', 700, 384);
}
// const key: TSYS_ShortcutKeys = ['Ctrl+Alt+G'] as unknown as TSYS_ShortcutKeys;
// eda.sys_ShortcutKey.unregisterShortcutKey(key);
// eda.sys_ShortcutKey.registerShortcutKey(key, 'Open About Page', async () => {
// 	console.log('Shortcut Key Activated');
// });

// const allel = await eda.pcb_Drc.getAllEqualLengthNetGroups();
// allel.forEach((el) => {
// 	if (el.name.endsWith('_DIFP')) {
// 		eda.pcb_Drc.deleteEqualLengthNetGroup(el.name);
// 	}
// });

// const alldfp = await eda.pcb_Drc.getAllDifferentialPairs();
// alldfp.forEach((dfp) => {
// 	console.log('Differential Pair Name:', dfp.name);
// 	eda.pcb_Drc.createEqualLengthNetGroup(`${dfp.name}_DIFP`, [dfp.positiveNet, dfp.negativeNet], { r: 250, g: 250, b: 250, alpha: 1.0 });
// });
