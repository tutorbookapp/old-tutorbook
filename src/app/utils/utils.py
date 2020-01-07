import os


def unpublish(directory, prefix="tutorbook-"):
    for package in os.listdir(directory):
        print(f"[DEBUG] Unpublishing {prefix}{package}...")
        os.system(f"npm unpublish {prefix}{package} --force")


def publish(directory, prefix="@tutorbook/"):
    for package in os.listdir(directory):
        print(f"[DEBUG] Publishing {prefix}{package}...")
        os.system(f"cd {directory}{package} && npm publish --access public")


def updateReqs(directory, prefix="@tutorbook/", vals=[]):
    for package in os.listdir(directory):
        vals.append(package)
    for package in os.listdir(directory):
        for jsfile in os.listdir(f"{directory}{package}"):
            if jsfile.endswith(".js"):
                with open(f"{directory}{package}/{jsfile}", "r") as file:
                    filedata = file.read()
                for val in vals:
                    filedata = filedata.replace(
                        f"require('{val}')", f"require('{prefix}{val}')"
                    )
                with open(f"{directory}{package}/{jsfile}", "w") as file:
                    filedata = file.write(filedata)


def changeRepoUrl(
    directory,
    oldUrl="github.com/nicholaschiang/tutorbook.git",
    newUrl="github.com/tutorbookapp/tutorbook.git",
):
    for package in os.listdir(directory):
        for jsonfile in os.listdir(f"{directory}{package}"):
            if jsonfile == "package.json":
                with open(f"{directory}{package}/{jsonfile}", "r") as file:
                    filedata = file.read()
                with open(f"{directory}{package}/{jsonfile}", "w") as file:
                    file.write(filedata.replace(oldUrl, newUrl))


if __name__ == "__main__":
    changeRepoUrl("../packages/", oldUrl="0.2.4", newUrl="0.2.5")
