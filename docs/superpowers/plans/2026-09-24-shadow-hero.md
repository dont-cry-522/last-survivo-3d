# 影裔角色 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有 3D 游戏中加入一位可选、较矮且低多边形的暗影角色及其暗系战斗路线。

**Architecture:** 新模型和动画位于 `wraith-model.js`，只暴露创建/逐帧动画接口；`rules.js` 管理角色武器、分支和专属技能；`main.js` 接入战斗、影步、UI；`skill-vfx.js` 与 `audio.js` 提供暗系可辨识的反馈。

**Tech Stack:** 原生 JavaScript、Three.js、Node test、Playwright 浏览器测试、GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-09-24-shadow-hero-design.md`

## Global Constraints

- 保留现有游侠、霜影的武器与通用升级池。
- 不复制第三方角色资产；只参考暗影、瞬移和遮蔽的主题。
- 手机粒子上限仍为 110；影步落点必须在可通行地形。
- 新武器每件有两条路线，3、5、8 级解锁；手动及自动攻击可用。

## Review Focus

- 手机横屏中第三个角色按钮、武器按钮和升级卡不被遮挡：加入多视口浏览器检查。
- 切换角色、地图和重复开局后模型、粒子及武器不会残留：加入重开与资源检查。
- 暗系专属技能不能出现在旧角色升级池，旧三元素不能出现在影裔池：规则测试。
- 影步不能落进障碍或地图外：浏览器测试。
- 暗影印记在更换目标、目标死亡和升级路线切换时不会错误共享：战斗测试。

### Task 1: 英雄与升级规则

**Files:** `rules.js`, `tests/rules.test.js`, `tests/weapon-paths.test.js`

**Interfaces:** `weaponFor(hero,index)`、`chooseUpgrades(player,random)`、`weaponStats(player)`、`takeUpgrade(player,id)` 继续保持原签名。`player.heroId='wraith'` 选择影裔专属法术池。

- [ ] 写失败测试：`weaponFor('wraith',0/1/2)` 分别返回 `shade/shadowblade/dark`；前两者各有两路线；旧角色看不到 `veil/chain/rift`，影裔看不到 `fire/ice/storm`。
- [ ] 运行 `node --test tests/rules.test.js tests/weapon-paths.test.js`，确认因功能缺失失败。
- [ ] 实现最小规则：新武器基础数值、六条相关路线中的四条新增路线、专属升级筛选和数值变化。
- [ ] 重跑目标测试与 `npm test`。

### Task 2: 原创低多边形角色

**Files:** `wraith-model.js`（新增）、`world.js`, `tests/wraith-model.test.js`

**Interfaces:** `makeWraith(weapon): THREE.Group`、`animateWraith(group,time,speed,attack,hurt): void`。`world.actor('wraith',weapon)` 和 `world.animateActor` 路由到此模块。

- [ ] 写失败测试：高度低于既有原型人物、兜帽/面罩/碎片披风存在，三种武器外形不同，行走和攻击时关节变化且矩阵有限。
- [ ] 运行 `node --test tests/wraith-model.test.js`，确认失败。
- [ ] 用共享几何体与材质建立兜帽、面罩、胸核、短腿、手臂、披风和武器；逐帧使用实际速度插值动作，不新建几何体。
- [ ] 重跑目标测试与 `npm test`。

### Task 3: 战斗反馈与影系技能

**Files:** `main.js`, `skill-vfx.js`, `audio.js`, `tests/browser-shadow-hero.cjs`, `tests/skill-vfx.test.js`

**Interfaces:** 新弹药 `shade` 三连印记和 `shadowblade` 飞刃；`SkillVFX.shadowHit/chain` 接收世界坐标；影裔的 `veil/chain/rift` 使用 `player.spell` 冷却计时。

- [ ] 写失败浏览器测试：影弹三次命中触发爆发、影刃可伤怪且可走升级路线、三种暗系升级生效、影步跨障碍并停在空地、连续施法不超粒子上限。
- [ ] 运行 `node tests/browser-shadow-hero.cjs`，确认功能缺失导致失败。
- [ ] 在原射击和技能循环中加入暗系分支，沿用现有命中与伤害入口；音效与 VFX 使用深色核心、紫色余辉和轻短尾迹。
- [ ] 重跑目标测试与旧攻击测试。

### Task 4: 选择界面、移动端与发布

**Files:** `index.html`, `style.css`, `main.js`, `README.md`, `tests/browser-shadow-hero.cjs`

- [ ] 写失败多视口检查：桌面、844×390 横屏和 390×844 竖屏能选择影裔、三种武器、开始游戏；HUD 标明角色与影步。
- [ ] 运行目标浏览器测试，确认 UI 尚未接入时失败。
- [ ] 接入第三个按钮、文字与缓存版本；压缩菜单按钮尺寸，确保横屏可点；README 记录 v16。
- [ ] 运行 `npm test`、全部 `tests/browser-*.cjs`、语法与 diff 检查；人工查看菜单及对局截图。
- [ ] 提交并推送 `main`；确认 GitHub Pages 的新资源与部署成功。
