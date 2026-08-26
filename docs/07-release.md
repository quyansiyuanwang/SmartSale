# 构建与移动端发布

## Web/PWA

```powershell
npm ci
npm run build
```

发布 `dist/` 内容到静态托管服务。详见 [服务端与 Web/PWA 部署](02-server-deployment.md)。

## Android 与 iOS 同步

每次修改前端后，先构建并同步 Capacitor：

```powershell
npm run android:sync
npm run ios:sync
```

Android 工程位于 `android/`，包名为 `com.smartsale.app`，最低 Android 版本为 7.0（API 24）。iOS 工程位于 `ios/App/`，同样使用 bundle identifier `com.smartsale.app`。本机 iOS 构建需要 macOS 和 Xcode。

## GitHub Actions 制品

推送分支或手动运行 `Build and release` 会依次执行 lint、单元测试和生产构建，并生成：

- Web/PWA zip。
- Android debug APK。
- iOS unsigned `.xcarchive.zip`。

非 tag 制品保留 30 天。iOS unsigned archive 不能直接安装到真机。

## 正式 Release

1. 将 `package.json` 的版本更新为 `X.Y.Z`。
2. 配齐下表的 GitHub Actions Secrets。
3. 创建并推送完全匹配的 tag：`vX.Y.Z`。

```powershell
git tag vX.Y.Z
git push origin vX.Y.Z
```

| 平台 | Secret |
| --- | --- |
| Android | `ANDROID_KEYSTORE_BASE64` |
| Android | `ANDROID_KEYSTORE_PASSWORD` |
| Android | `ANDROID_KEY_ALIAS` |
| Android | `ANDROID_KEY_PASSWORD` |
| iOS | `APPLE_CERTIFICATE_BASE64` |
| iOS | `APPLE_CERTIFICATE_PASSWORD` |
| iOS | `APPLE_PROVISIONING_PROFILE_BASE64` |
| iOS | `APPLE_TEAM_ID` |
| iOS | `IOS_KEYCHAIN_PASSWORD` |

全部密钥存在时，工作流生成签名 APK、AAB 和 Ad Hoc IPA，并创建 GitHub Release 与 `SHA256SUMS.txt`。Ad Hoc IPA 只能安装到已登记在 provisioning profile 中的设备。

原生壳中同样包含构建时的 `VITE_*` 配置。切换 Supabase 项目、匿名公钥或公开域名后，必须重新构建并同步原生工程，不能只替换服务端配置。
