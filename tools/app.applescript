-- DSH Web 启动器（无窗口版）
-- 双击后：后台启动服务 → 浏览器自动打开；Dock 里留一个图标，退出即停。
-- 再次点击图标（reopen）＝重新打开浏览器页面。

property serverPid : ""

on run
	set basePath to POSIX path of (path to me)
	set homePath to POSIX path of (path to home folder)
	set launcher to basePath & "Contents/Resources/launcher/bin/dsh-web"
	set runLog to homePath & ".dsh-web-launcher/last-run.log"

	try
		do shell script "mkdir -p " & quoted form of (homePath & ".dsh-web-launcher")
		set serverPid to do shell script "nohup " & quoted form of launcher & " > " & quoted form of runLog & " 2>&1 & echo $!"
	on error errMsg number errNum
		display alert "DSH Web 启动失败" message errMsg as critical
		quit
		return
	end try

	-- 启动器如果秒退（例如已经有实例在跑），就没必要在 Dock 里留着
	delay 2
	if not my serverAlive() then
		try
			set tailText to do shell script "tail -n 6 " & quoted form of runLog & " 2>/dev/null"
		on error
			set tailText to ""
		end try
		if tailText does not contain "检测到已有实例" and tailText does not contain "已在默认浏览器打开" then
			if tailText is "" then
				display alert "DSH Web 没能启动" message "启动脚本没有输出任何内容。" as critical
			else
				display alert "DSH Web 没能启动" message tailText as critical
			end if
		end if
		quit
	end if
end run

on reopen
	set basePath to POSIX path of (path to me)
	set urlTool to basePath & "Contents/Resources/launcher/bin/dsh-web-url"
	set openTool to basePath & "Contents/Resources/launcher/bin/dsh-open"
	try
		set targetUrl to do shell script quoted form of urlTool
		do shell script quoted form of openTool & " " & quoted form of targetUrl
	end try
end reopen

on idle
	if serverPid is not "" and not my serverAlive() then quit
	return 5
end idle

on serverAlive()
	if serverPid is "" then return false
	try
		set answer to do shell script "kill -0 " & serverPid & " >/dev/null 2>&1 && echo yes || echo no"
	on error
		return false
	end try
	return answer is "yes"
end serverAlive

on quit
	if serverPid is not "" then
		try
			do shell script "kill -TERM " & serverPid & " >/dev/null 2>&1; true"
		end try
		delay 0.3
	end if
	continue quit
end quit
