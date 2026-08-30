module ResourceScope
  private

  def accessible_trips
    current_user.trips
  end

  def not_found!(resource = "Resource")
    render json: { error: "#{resource} not found" }, status: :not_found
  end

  def forbidden!(message = "You are not authorized to perform this action")
    render json: { error: message }, status: :forbidden
  end
end
