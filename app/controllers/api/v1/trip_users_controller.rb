class Api::V1::TripUsersController < ApplicationController
  before_action :set_trip_user, only: [:show, :update, :destroy]

  # GET /trip_users
  def index
    @trip_users = TripUser.all

    render json: @trip_users
  end

  # GET /trip_users/1
  def show
    render json: @trip_user
  end

  # POST /trip_users
  def create
    @trip_user = TripUser.new(trip_user_params)

    if @trip_user.save
      render json: @trip_user, status: :created, location: @trip_user
    else
      render json: @trip_user.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /trip_users/1
  def update
    if @trip_user.update(trip_user_params)
      render json: @trip_user
    else
      render json: @trip_user.errors, status: :unprocessable_entity
    end
  end

  # DELETE /trip_users/1
  def destroy
    @trip_user.destroy
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_trip_user
      @trip_user = TripUser.find(params[:id])
    end

    # Only allow a trusted parameter "white list" through.
    def trip_user_params
      params.require(:trip_user).permit(:trip_user,:trip_id_id, :user_id_id)
    end
end
