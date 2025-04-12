#!/bin/bash

# 获取当前版本号
current_version=$(node -p "require('./package.json').version")
IFS='.' read -r major minor patch <<< "$current_version"

# 计算下一个版本号
next_patch="$major.$minor.$((patch + 1))"
next_minor="$major.$((minor + 1)).0"
next_major="$((major + 1)).0.0"

# 使用 printf 格式化输出
printf "1) patch (v$current_version → v$next_patch)\n"
printf "2) minor (v$current_version → v$next_minor)\n"
printf "3) major (v$current_version → v$next_major)\n"

# 用户输入选择
while true; do
  read -p "请选择版本更新类型（输入 1 / 2 / 3）：" choice
  case $choice in
    1) version_type="patch"; new_version=$next_patch; break ;;
    2) version_type="minor"; new_version=$next_minor; break ;;
    3) version_type="major"; new_version=$next_major; break ;;
    *) echo "❗ 无效输入，请重新选择。" ;;
  esac
done

echo "你选择了$version_type 更新，版本号将变更为 v$new_version"

# 获取 commit 信息
while true; do
  read -p "请输入 commit 信息：" commit_msg
  if [[ -z "$commit_msg" ]]; then
    echo "❗ Commit 信息不能为空，请重新输入"
  else
    break
  fi
done

# 执行版本更新
npm version $version_type --no-git-tag-version

# 构建代码
npm run build

# 提交到 Git
git add .
git commit -m "$commit_msg"

# 打 tag
git tag v$new_version

# 发布
npm publish