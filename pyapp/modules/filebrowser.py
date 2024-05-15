import json
import os
import stat
from pathlib import Path

# import win32api
# import win32file


# def get_local_drives_win32api():
#     drives = win32api.GetLogicalDriveStrings().split("\x00")
#     local_drives = [
#         drive
#         for drive in drives
#         if win32file.GetDriveType(drive) == win32file.DRIVE_FIXED
#     ]
#     return local_drives


def is_folder_normal(folder_path):
    try:
        attributes = os.stat(folder_path).st_file_attributes
        return not (
            attributes & stat.FILE_ATTRIBUTE_HIDDEN != 0
            or attributes & stat.FILE_ATTRIBUTE_SYSTEM != 0
            or attributes & stat.FILE_ATTRIBUTE_READONLY != 0
        )
    except FileNotFoundError:
        return False  # Folder does not exist


def is_filePySC(folder_path: Path, flext: str = "psc"):
    if folder_path.suffix.lower() != f".{flext}":
        return False
    else:
        try:
            attributes = os.stat(folder_path).st_file_attributes
            return not (
                attributes & stat.FILE_ATTRIBUTE_HIDDEN != 0
                or attributes & stat.FILE_ATTRIBUTE_SYSTEM != 0
                or attributes & stat.FILE_ATTRIBUTE_READONLY != 0
            )
        except FileNotFoundError:
            return False  # Folder does not exist


def list_files(flext: str, startpath: Path):
    # tes if its file
    if startpath.suffix.lower() == f".{flext}":
        startpath = startpath.parent

    if startpath.exists():
        contents = list(startpath.iterdir())
        return {
            "parent": startpath,
            "children": [
                {"name": item.name, "type": 1 if item.is_dir() else 2}
                for item in contents
                if (item and item.is_dir() and is_folder_normal(item))
                or (item.is_file() and is_filePySC(item, flext))
            ],
        }
    return {"parent": None, "children": []}


# def list_drives():
#     local_drives = get_local_drives_win32api()
#     return {
#         "parent": "__drive__",
#         "children": [{"name": item, "type": 0} for item in local_drives],
#     }


# if __name__ == "__main__":
#     local_drives_win32api = get_local_drives_win32api()
#     print("Local drives (win32api):", local_drives_win32api)
#     list_files(Path("c:\\"))
