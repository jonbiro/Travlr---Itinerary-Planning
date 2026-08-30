class Api::V1::TripUsersController < ApplicationController
  include ResourceScope

  before_action :set_trip_user, only: [:show, :update, :destroy]

  # GET /trip_users
  def index
    @trip_users = current_user.trip_users

    render json: @trip_users
  end

  # GET /trip_users/1
  def show
    render json: @trip_user
  end

  # POST /trip_users
  def create
    trip = accessible_trips.find_by(id: trip_user_params[:trip_id])
    return forbidden!("You must belong to the trip") unless trip

    user = User.find_by(id: trip_user_params[:user_id].presence || current_user.id)
    return render json: { error: "User not found" }, status: :unprocessable_entity unless user

    @trip_user = trip.trip_users.new(user: user)

    if @trip_user.save
      render json: @trip_user, status: :created, location: @trip_user
    else
      render json: @trip_user.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /trip_users/1
  def update
    render json: { error: "Memberships cannot be reassigned" }, status: :unprocessable_entity
  end

  # DELETE /trip_users/1
  def destroy
    @trip_user.destroy
    head :no_content
  end

  private
    # Use callbacks to share common setup or constraints between actions.
  def set_trip_user
      @trip_user = current_user.trip_users.find_by(id: params[:id])
      not_found!("Trip membership") unless @trip_user
    end

    # Only allow a trusted parameter "white list" through.
    def trip_user_params
      params.require(:trip_user).permit(:trip_id, :user_id)
    end
end
