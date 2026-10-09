from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserCreate, UserUpdate, UserPasswordUpdate, UserOut, UserImport
from app.services import user_service
from app.api.deps import get_current_user, require_permission
from app.core.rbac import Permission

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/import", response_model=List[UserOut], status_code=status.HTTP_201_CREATED)
async def import_users(
    file: bytes = ...,
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """Import users from Excel file (.xlsx/.xls).
    Expected columns: name, email, password, role
    Role values: employee, hr, admin, vendor
    """
    import_str = base64.b64decode(file).decode("utf-8")
    # In a real implementation, we would use openpyxl or xlsx to parse the file
    # For now, we'll raise a not implemented error until the library is available
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Excel import library not yet configured - use individual user creation for now"
    )


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """
    Create a new user (Admin or HR only).
    Only Admin can create another Admin.
    """
    if data.role.value == "admin" and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can create Admin accounts"
        )

    user = user_service.create_user(data)
    return user


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the currently logged-in user"""
    return current_user


@router.get("/", response_model=list[UserOut])
async def list_users(
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """List all users (Admin / HR)"""
    return user_service.list_users()


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    data: UserUpdate,
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """Update a user (Admin / HR)"""
    return user_service.update_user(user_id, data, current_user)


@router.post("/{user_id}/password")
async def update_user_password(
    user_id: str,
    data: UserPasswordUpdate,
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """Change / reset user password (Admin / HR)"""
    return user_service.update_user_password(user_id, data.password, current_user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """Delete a user from directory and auth (Admin / HR)"""
    return user_service.delete_user(user_id, current_user)
